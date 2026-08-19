import { useMemo, useRef, useState } from 'react'
import {
  Check, Download, Eye, Gear, History, Layers, MapPin, Route as RouteIcon,
  Settings, SlidersHorizontal, X
} from 'lucide-react'
import { sampleTrack } from './sample'
import { douglasPeucker, filterNearby, fit, haversineMeters, mercator } from './geo'
import { exportSvg, linePath } from './svg'
import type { XYPoint } from './types'

type Layer = 'standard'|'satellite'|'hybrid'
type FramePreset = 'square'|'wide'|'tall'|'freeform'
type Panel = null|'route'|'style'|'settings'|'layers'|'history'|'svgPreview'
type Units = 'mi'|'km'
type RouteStyle = 'smooth'|'straight'|'dotted'

function sceneTransform(points:XYPoint[], zoom:number, rotation:number, panX:number, panY:number){
  const r=rotation*Math.PI/180, c=Math.cos(r), s=Math.sin(r)
  const cx=500, cy=500
  return points.map(p=>{
    const dx=(p.x-cx)*zoom, dy=(p.y-cy)*zoom
    return {x:cx+dx*c-dy*s+panX, y:cy+dx*s+dy*c+panY}
  })
}

const sampleHistory = [
  {id:1,title:'Morning Route',date:'Aug 18, 2026',detail:'4.27 mi · 1:1'},
  {id:2,title:'Riverside Loop',date:'Aug 16, 2026',detail:'6.12 mi · 3:1'},
  {id:3,title:'City Explorer',date:'Aug 12, 2026',detail:'3.85 mi · 4:5'},
  {id:4,title:'Coastal Path',date:'Aug 9, 2026',detail:'8.40 mi · 1:1'},
]

export default function App(){
  const [panel,setPanel]=useState<Panel>(null)

  const [stroke,setStroke]=useState('#3B6EA8')
  const [strokeWidth,setStrokeWidth]=useState(5)
  const [smooth,setSmooth]=useState(true)
  const [markers,setMarkers]=useState(true)
  const [caption,setCaption]=useState('')
  const [epsilon,setEpsilon]=useState(8)
  const [layer,setLayer]=useState<Layer>('standard')

  const [units,setUnits]=useState<Units>('mi')
  const [defaultRouteStyle,setDefaultRouteStyle]=useState<RouteStyle>('smooth')
  const [defaultPrintArea,setDefaultPrintArea]=useState<FramePreset>('square')
  const [saveHistory,setSaveHistory]=useState(true)

  const [startDate,setStartDate]=useState('2026-08-01')
  const [startTime,setStartTime]=useState('09:00')
  const [endDate,setEndDate]=useState('2026-08-01')
  const [endTime,setEndTime]=useState('17:00')

  const [mapZoom,setMapZoom]=useState(1)
  const [mapRotation,setMapRotation]=useState(0)
  const [pan,setPan]=useState({x:0,y:0})

  const [framePreset,setFramePreset]=useState<FramePreset>('square')
  const [frameWidth,setFrameWidth]=useState(76)
  const [freeHeight,setFreeHeight]=useState(42)

  const gesture=useRef<any>(null)
  const frameResize=useRef<any>(null)
  const panelDrag=useRef<{startY:number,currentY:number}|null>(null)
  const [panelOffset,setPanelOffset]=useState(0)

  const basePoints=useMemo(()=>{
    const filtered=filterNearby(sampleTrack,10)
    const simplified=douglasPeucker(filtered.map(mercator),epsilon)
    return fit(simplified,1000,1000,.62)
  },[epsilon])

  const transformed=useMemo(
    ()=>sceneTransform(basePoints,mapZoom,mapRotation,pan.x,pan.y),
    [basePoints,mapZoom,mapRotation,pan]
  )

  const routeD=linePath(basePoints,defaultRouteStyle==='smooth' ? smooth : false)
  const first=basePoints[0],last=basePoints[basePoints.length-1]

  const distanceMeters=useMemo(()=>{
    let total=0
    for(let i=1;i<sampleTrack.length;i++) total+=haversineMeters(sampleTrack[i-1],sampleTrack[i])
    return total
  },[])
  const distanceValue=units==='mi' ? distanceMeters/1609.344 : distanceMeters/1000
  const distanceLabel=`${distanceValue.toFixed(2)} ${units}`

  const dist=(a:React.Touch,b:React.Touch)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)
  const angle=(a:React.Touch,b:React.Touch)=>Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI

  const onMapTouchStart=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest('.topbar,.preset-strip,.bottom-nav,.frame-handle,.export-bubble,.layers-bubble,.distance-pill')) return
    if(e.touches.length===1){
      const t=e.touches[0]
      gesture.current={mode:'pan',x:t.clientX,y:t.clientY,panX:pan.x,panY:pan.y,zoom:mapZoom,rotation:mapRotation}
    }else if(e.touches.length>=2){
      const a=e.touches[0],b=e.touches[1]
      gesture.current={mode:'pinch',distance:dist(a,b),angle:angle(a,b),zoom:mapZoom,rotation:mapRotation,panX:pan.x,panY:pan.y}
    }
  }
  const onMapTouchMove=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest('.topbar,.preset-strip,.bottom-nav,.frame-handle,.export-bubble,.layers-bubble,.distance-pill')) return
    e.preventDefault()
    const g=gesture.current
    if(!g)return
    if(e.touches.length===1 && g.mode==='pan'){
      const t=e.touches[0]
      setPan({x:g.panX+(t.clientX-g.x)*1.8,y:g.panY+(t.clientY-g.y)*1.8})
    }else if(e.touches.length>=2){
      const a=e.touches[0],b=e.touches[1]
      if(g.mode!=='pinch'){
        gesture.current={mode:'pinch',distance:dist(a,b),angle:angle(a,b),zoom:mapZoom,rotation:mapRotation,panX:pan.x,panY:pan.y}
        return
      }
      setMapZoom(Math.max(.08,Math.min(6,g.zoom*(dist(a,b)/(g.distance||1)))))
      setMapRotation(g.rotation+(angle(a,b)-g.angle))
    }
  }
  const onMapTouchEnd=(e:React.TouchEvent)=>{
    if(e.touches.length===0)gesture.current=null
    else if(e.touches.length===1){
      const t=e.touches[0]
      gesture.current={mode:'pan',x:t.clientX,y:t.clientY,panX:pan.x,panY:pan.y,zoom:mapZoom,rotation:mapRotation}
    }
  }

  const aspect = framePreset==='square'?'1 / 1':framePreset==='wide'?'3 / 1':framePreset==='tall'?'4 / 5':'auto'
  const applyPreset=(p:FramePreset)=>{
    setFramePreset(p)
    if(p==='square')setFrameWidth(76)
    if(p==='wide')setFrameWidth(88)
    if(p==='tall')setFrameWidth(62)
  }
  const startFrame=(x:number,y:number)=>{
    setFramePreset('freeform')
    const el=document.querySelector('.print-frame') as HTMLElement|null
    const rect=el?.getBoundingClientRect()
    frameResize.current={x,y,w:(rect?.width||300)/window.innerWidth*100,h:(rect?.height||300)/window.innerHeight*100}
  }
  const moveFrame=(x:number,y:number)=>{
    const g=frameResize.current;if(!g)return
    setFrameWidth(Math.max(18,Math.min(94,g.w+(x-g.x)/window.innerWidth*100)))
    setFreeHeight(Math.max(12,Math.min(72,g.h+(y-g.y)/window.innerHeight*100)))
  }

  const svgString=useMemo(()=>exportSvg({
    points:transformed,stroke,strokeWidth,
    smooth:defaultRouteStyle==='smooth' ? smooth : false,
    startDot:markers,endArrow:markers,caption
  }),[transformed,stroke,strokeWidth,smooth,defaultRouteStyle,markers,caption])

  const download=()=>{
    const blob=new Blob([svgString],{type:'image/svg+xml'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='route-studio.svg';a.click()
    URL.revokeObjectURL(url)
  }

  const openPanel=(p:Panel)=>{setPanelOffset(0);setPanel(p)}
  const closePanel=()=>{setPanelOffset(0);setPanel(null)}
  const onSheetStart=(y:number)=>panelDrag.current={startY:y,currentY:y}
  const onSheetMove=(y:number)=>{
    if(!panelDrag.current)return
    panelDrag.current.currentY=y
    setPanelOffset(Math.max(0,y-panelDrag.current.startY))
  }
  const onSheetEnd=()=>{
    if(panelOffset>90)closePanel()
    else setPanelOffset(0)
    panelDrag.current=null
  }

  const logo = <div className="header-logo">
    <img src="./app-icon-192.png" alt=""/>
    <span>ROUTE STUDIO</span>
  </div>

  return <main className="app">
    <div className="landscape-lock"><div><strong>Route Studio is designed for portrait.</strong><span>Rotate your device to continue.</span></div></div>

    <section className={`map-stage layer-${layer}`}
      onTouchStart={onMapTouchStart}
      onTouchMove={onMapTouchMove}
      onTouchEnd={onMapTouchEnd}
      onTouchCancel={()=>gesture.current=null}>

      <div className="scene-square" style={{transform:`translate(calc(-50% + ${pan.x/8}px), calc(-50% + ${pan.y/8}px)) scale(${mapZoom}) rotate(${mapRotation}deg)`}}>
        <div className="map-grid"/>
        <div className="map-water water-a"/><div className="map-water water-b"/>
        <div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/>
        <div className="map-block block-a"/><div className="map-block block-b"/><div className="map-block block-c"/>
        <svg className="route-scene" viewBox="0 0 1000 1000">
          <path d={routeD} fill="none" stroke={stroke} strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={defaultRouteStyle==='dotted'?'1 16':undefined}/>
          {markers&&first&&<circle cx={first.x} cy={first.y} r="12" fill="#F5F1E8" stroke={stroke} strokeWidth="6" vectorEffect="non-scaling-stroke"/>}
          {markers&&last&&<circle cx={last.x} cy={last.y} r="10" fill={stroke}/>}
        </svg>
      </div>

      <header className="topbar">
        <div/>
        {logo}
        <button className="layers-bubble" onClick={()=>openPanel('layers')} aria-label="Map layers"><Layers/></button>
      </header>

      <div className="preset-row">
        <div className="preset-strip">
          {(['square','wide','tall','freeform'] as FramePreset[]).map(p=>
            <button key={p} className={framePreset===p?'active':''} onClick={()=>applyPreset(p)}>
              {p==='square'?'1:1':p==='wide'?'3:1':p==='tall'?'4:5':'Freeform'}
            </button>
          )}
        </div>
        <button className="export-bubble" onClick={()=>openPanel('svgPreview')} aria-label="Preview SVG"><Eye/></button>
      </div>

      <div className={`print-frame ${framePreset==='freeform'?'freeform':''}`} style={{
        width:`${frameWidth}vw`,aspectRatio:framePreset==='freeform'?'auto':aspect,
        height:framePreset==='freeform'?`${freeHeight}vh`:'auto'
      }}>
        <button className="frame-handle" aria-label="Resize print area"
          onPointerDown={e=>{e.stopPropagation();startFrame(e.clientX,e.clientY);(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
          onPointerMove={e=>frameResize.current&&moveFrame(e.clientX,e.clientY)}
          onPointerUp={()=>frameResize.current=null}
          onPointerCancel={()=>frameResize.current=null}/>
      </div>

      <div className="distance-pill"><RouteIcon/><span>{distanceLabel}</span></div>

      <nav className="bottom-nav">
        <button onClick={()=>openPanel('route')}><RouteIcon/><span>Route</span></button>
        <button onClick={()=>openPanel('style')}><SlidersHorizontal/><span>Style</span></button>
        <button onClick={()=>openPanel('history')}><History/><span>History</span></button>
        <button onClick={()=>openPanel('settings')}><Settings/><span>Settings</span></button>
      </nav>
    </section>

    {panel&&<div className="modal-shade" onClick={closePanel}>
      <section className={`panel ${panel==='svgPreview'?'preview-panel':''}`} style={{transform:`translateY(${panelOffset}px)`}} onClick={e=>e.stopPropagation()}>
        <div className="sheet-drag"
          onPointerDown={e=>{onSheetStart(e.clientY);(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
          onPointerMove={e=>panelDrag.current&&onSheetMove(e.clientY)}
          onPointerUp={onSheetEnd}
          onPointerCancel={onSheetEnd}><span/></div>
        <div className="panel-head">
          <h2>{panel==='route'?'Route':panel==='style'?'Style':panel==='settings'?'Settings':panel==='history'?'History':panel==='layers'?'Map Style':'SVG Preview'}</h2>
          <button onClick={closePanel}><X/></button>
        </div>

        {panel==='route'&&<>
          <div className="date-grid">
            <label><span>Start Date</span><div className="input-wrap"><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div></label>
            <label><span>Start Time</span><div className="input-wrap"><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></div></label>
            <label><span>End Date</span><div className="input-wrap"><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div></label>
            <label><span>End Time</span><div className="input-wrap"><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></div></label>
          </div>
          <button className="primary-action">Fetch Location Data</button>
        </>}

        {panel==='style'&&<>
          <div className="style-preview"><svg viewBox="0 0 220 72"><path d="M10 55 C55 20 95 63 132 30 S190 20 210 12" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/></svg></div>
          <div className="control-group">
            <label className="slider-control"><span><b>Line Width</b><em>{strokeWidth}px</em></span><input type="range" min="1" max="18" value={strokeWidth} onChange={e=>setStrokeWidth(+e.target.value)}/></label>
            <label className="row-control"><span><b>Color</b><small>Steel Blue</small></span><input className="color-well" type="color" value={stroke} onChange={e=>setStroke(e.target.value)}/></label>
            <label className="slider-control"><span><b>Simplification</b><em>{epsilon}m</em></span><input type="range" min="0" max="50" value={epsilon} onChange={e=>setEpsilon(+e.target.value)}/></label>
            <label className="switch-control"><span>Smooth Curves</span><input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/></label>
            <label className="switch-control"><span>Start & End Markers</span><input type="checkbox" checked={markers} onChange={e=>setMarkers(e.target.checked)}/></label>
          </div>
          <label className="caption"><span>Caption</span><input type="text" placeholder="Optional" value={caption} onChange={e=>setCaption(e.target.value)}/></label>
        </>}

        {panel==='settings'&&<>
          <div className="settings-section">
            <h3>Units</h3>
            <div className="segmented-setting">
              <button className={units==='mi'?'active':''} onClick={()=>setUnits('mi')}>Miles</button>
              <button className={units==='km'?'active':''} onClick={()=>setUnits('km')}>Kilometers</button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Default Route Style</h3>
            <div className="style-choice-grid">
              <button className={defaultRouteStyle==='smooth'?'active':''} onClick={()=>setDefaultRouteStyle('smooth')}>Smooth</button>
              <button className={defaultRouteStyle==='straight'?'active':''} onClick={()=>setDefaultRouteStyle('straight')}>Straight</button>
              <button className={defaultRouteStyle==='dotted'?'active':''} onClick={()=>setDefaultRouteStyle('dotted')}>Dotted</button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Default Print Area</h3>
            <div className="style-choice-grid four">
              {(['square','wide','tall','freeform'] as FramePreset[]).map(p=>
                <button key={p} className={defaultPrintArea===p?'active':''} onClick={()=>{setDefaultPrintArea(p);applyPreset(p)}}>
                  {p==='square'?'1:1':p==='wide'?'3:1':p==='tall'?'4:5':'Free'}
                </button>
              )}
            </div>
          </div>

          <div className="settings-section"><h3>Map & Display</h3>
            <button onClick={()=>openPanel('layers')}><span><Layers/> Default Map Style</span><small>{layer}</small></button>
          </div>
          <div className="settings-section"><h3>Data & Privacy</h3>
            <button onClick={()=>setSaveHistory(v=>!v)}><span><History/> Save Route History</span><small>{saveHistory?'On':'Off'}</small></button>
          </div>
        </>}

        {panel==='history'&&<>
          <div className="history-search">Previously worked routes</div>
          <div className="history-list-sheet">
            {sampleHistory.map(item=><button className="history-card-sheet" key={item.id} onClick={closePanel}>
              <div className="history-thumb"><RouteIcon/></div>
              <div><b>{item.title}</b><span>{item.date}</span><small>{item.detail}</small></div>
              <span className="chev">›</span>
            </button>)}
          </div>
        </>}

        {panel==='layers'&&<>
          {(['standard','satellite','hybrid'] as Layer[]).map(l=><button key={l} className="layer-option" onClick={()=>{setLayer(l);closePanel()}}>
            <span className={`layer-thumb ${l}`}/><span>{l[0].toUpperCase()+l.slice(1)}</span>{layer===l&&<Check/>}
          </button>)}
        </>}

        {panel==='svgPreview'&&<>
          <div className="svg-viewer">
            <div className="checker"/>
            <div className="svg-render" dangerouslySetInnerHTML={{__html:svgString.replace(/^<\?xml[^>]*>\s*/,'')}}/>
          </div>
          <div className="preview-meta">
            <span>{framePreset==='square'?'1:1':framePreset==='wide'?'3:1':framePreset==='tall'?'4:5':'Freeform'}</span>
            <span>{distanceLabel}</span>
          </div>
          <button className="primary-action export-action" onClick={download}><Download/> Export SVG</button>
        </>}
      </section>
    </div>}
  </main>
}