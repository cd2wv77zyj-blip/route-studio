import { useMemo, useRef, useState } from 'react'
import {
  Check, ChevronRight, Download, Layers, Menu, Settings, SlidersHorizontal,
  X, CalendarDays, Palette, RotateCcw
} from 'lucide-react'
import { sampleTrack } from './sample'
import { douglasPeucker, filterNearby, fit, mercator } from './geo'
import { exportSvg, linePath } from './svg'
import type { XYPoint } from './types'

type Layer = 'standard'|'satellite'|'hybrid'
type FramePreset = 'square'|'wide'|'tall'|'freeform'
type Panel = null|'route'|'style'|'settings'|'layers'|'menu'

function transformPoints(points:XYPoint[], zoom:number, rotation:number, panX:number, panY:number){
  const rad=rotation*Math.PI/180
  const cos=Math.cos(rad), sin=Math.sin(rad)
  const cx=500, cy=500
  return points.map(p=>{
    const dx=(p.x-cx)*zoom
    const dy=(p.y-cy)*zoom
    return {
      x:cx + dx*cos - dy*sin + panX,
      y:cy + dx*sin + dy*cos + panY
    }
  })
}

export default function App(){
  const [panel,setPanel]=useState<Panel>(null)

  const [stroke,setStroke]=useState('#3B6EA8')
  const [strokeWidth,setStrokeWidth]=useState(6)
  const [smooth,setSmooth]=useState(true)
  const [markers,setMarkers]=useState(true)
  const [caption,setCaption]=useState('')
  const [epsilon,setEpsilon]=useState(8)
  const [layer,setLayer]=useState<Layer>('standard')

  const [startDate,setStartDate]=useState('2026-08-01')
  const [startTime,setStartTime]=useState('09:00')
  const [endDate,setEndDate]=useState('2026-08-01')
  const [endTime,setEndTime]=useState('17:00')

  // Geographic viewport state. Map and route always use this exact same transform.
  const [mapZoom,setMapZoom]=useState(1)
  const [mapRotation,setMapRotation]=useState(0)
  const [pan,setPan]=useState({x:0,y:0})

  // Print area is independent from geography.
  const [framePreset,setFramePreset]=useState<FramePreset>('square')
  const [frameWidth,setFrameWidth]=useState(76) // vw
  const [freeHeight,setFreeHeight]=useState(42) // vh only for Freeform
  const frameResize=useRef<{x:number,y:number,w:number,h:number}|null>(null)
  const gesture=useRef<any>(null)

  const basePoints=useMemo(()=>{
    const filtered=filterNearby(sampleTrack,10)
    const simplified=douglasPeucker(filtered.map(mercator),epsilon)
    return fit(simplified,1000,1000,.68)
  },[epsilon])

  const transformed=useMemo(
    ()=>transformPoints(basePoints,mapZoom,mapRotation,pan.x,pan.y),
    [basePoints,mapZoom,mapRotation,pan]
  )

  const d=linePath(basePoints,smooth)
  const first=basePoints[0], last=basePoints[basePoints.length-1]

  const applyPreset=(preset:FramePreset)=>{
    setFramePreset(preset)
    if(preset==='square') setFrameWidth(76)
    if(preset==='wide') setFrameWidth(88)
    if(preset==='tall') setFrameWidth(62)
    // Freeform intentionally preserves current width and uses freeHeight.
  }

  const aspectFor=(preset:FramePreset)=>{
    if(preset==='square') return '1 / 1'
    if(preset==='wide') return '3 / 1'
    if(preset==='tall') return '4 / 5'
    return 'auto'
  }

  const dist=(a:React.Touch,b:React.Touch)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)
  const ang=(a:React.Touch,b:React.Touch)=>Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI

  const onMapTouchStart=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest('.frame-handle,.topbar,.preset-strip,.bottom-tools,.floating-control')) return
    if(e.touches.length===1){
      const t=e.touches[0]
      gesture.current={mode:'pan',x:t.clientX,y:t.clientY,panX:pan.x,panY:pan.y,zoom:mapZoom,rotation:mapRotation}
    } else if(e.touches.length>=2){
      const a=e.touches[0],b=e.touches[1]
      gesture.current={mode:'pinch',distance:dist(a,b),angle:ang(a,b),zoom:mapZoom,rotation:mapRotation,panX:pan.x,panY:pan.y}
    }
  }
  const onMapTouchMove=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest('.frame-handle,.topbar,.preset-strip,.bottom-tools,.floating-control')) return
    e.preventDefault()
    const g=gesture.current
    if(!g)return
    if(e.touches.length===1 && g.mode==='pan'){
      const t=e.touches[0]
      setPan({x:g.panX+(t.clientX-g.x)*2,y:g.panY+(t.clientY-g.y)*2})
    } else if(e.touches.length>=2){
      const a=e.touches[0],b=e.touches[1]
      if(g.mode!=='pinch'){
        gesture.current={mode:'pinch',distance:dist(a,b),angle:ang(a,b),zoom:mapZoom,rotation:mapRotation,panX:pan.x,panY:pan.y}
        return
      }
      setMapZoom(Math.max(.5,Math.min(4,g.zoom*(dist(a,b)/(g.distance||1)))))
      setMapRotation(g.rotation+(ang(a,b)-g.angle))
    }
  }
  const onMapTouchEnd=(e:React.TouchEvent)=>{
    if(e.touches.length===0) gesture.current=null
    else if(e.touches.length===1){
      const t=e.touches[0]
      gesture.current={mode:'pan',x:t.clientX,y:t.clientY,panX:pan.x,panY:pan.y,zoom:mapZoom,rotation:mapRotation}
    }
  }

  const resetView=()=>{setMapZoom(1);setMapRotation(0);setPan({x:0,y:0})}

  const startFrameResize=(x:number,y:number)=>{
    setFramePreset('freeform')
    const frame=document.querySelector('.print-frame') as HTMLElement|null
    const rect=frame?.getBoundingClientRect()
    frameResize.current={
      x,y,w:(rect?.width||window.innerWidth*.76)/window.innerWidth*100,
      h:(rect?.height||window.innerHeight*.42)/window.innerHeight*100
    }
  }
  const resizeFrame=(x:number,y:number)=>{
    const g=frameResize.current
    if(!g)return
    setFrameWidth(Math.max(32,Math.min(92,g.w+(x-g.x)/window.innerWidth*100)))
    setFreeHeight(Math.max(18,Math.min(67,g.h+(y-g.y)/window.innerHeight*100)))
  }

  const download=()=>{
    const svg=exportSvg({points:transformed,stroke,strokeWidth,smooth,startDot:markers,endArrow:markers,caption})
    const blob=new Blob([svg],{type:'image/svg+xml'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='route-studio.svg';a.click()
    URL.revokeObjectURL(url)
  }

  const panelTitle = panel==='route'?'Route & Time':panel==='style'?'Style':panel==='settings'?'Settings':panel==='layers'?'Map Style':'Route Studio'

  return <main className="app">
    <div className="landscape-lock"><div><strong>Route Studio is designed for portrait.</strong><span>Rotate your device to continue.</span></div></div>

    <section className={`map-stage layer-${layer}`}
      onTouchStart={onMapTouchStart}
      onTouchMove={onMapTouchMove}
      onTouchEnd={onMapTouchEnd}
      onTouchCancel={()=>gesture.current=null}>

      <div className="map-transform" style={{transform:`translate(${pan.x/8}px,${pan.y/8}px) scale(${mapZoom}) rotate(${mapRotation}deg)`}}>
        <div className="map-grid"/>
        <div className="map-water water-a"/><div className="map-water water-b"/>
        <div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/>
        <div className="map-block block-a"/><div className="map-block block-b"/><div className="map-block block-c"/>
        <svg className="route-scene" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Route preview">
          <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          {markers&&first&&<circle cx={first.x} cy={first.y} r={strokeWidth*1.45+3} fill="#F5F1E8" stroke={stroke} strokeWidth={strokeWidth*.72}/>}
          {markers&&last&&<circle cx={last.x} cy={last.y} r={strokeWidth*1.45+3} fill={stroke}/>}
        </svg>
      </div>

      <header className="topbar">
        <button onClick={()=>setPanel('menu')} aria-label="Menu"><Menu/></button>
        <div className="brand-lockup"><img src="./app-icon-192.png"/><strong>Route Studio</strong></div>
        <button onClick={()=>setPanel('layers')} aria-label="Map layers"><Layers/></button>
      </header>

      <div className="preset-strip">
        {(['square','wide','tall','freeform'] as FramePreset[]).map(r=>
          <button key={r} className={framePreset===r?'active':''} onClick={()=>applyPreset(r)}>
            {r==='square'?'1:1':r==='wide'?'3:1':r==='tall'?'4:5':'Freeform'}
          </button>
        )}
      </div>

      <div className={`print-frame ${framePreset==='freeform'?'freeform':''}`} style={{
        width:`${frameWidth}vw`,
        aspectRatio:framePreset==='freeform'?'auto':aspectFor(framePreset),
        height:framePreset==='freeform'?`${freeHeight}vh`:'auto'
      }}>
        <span className="frame-label">SVG Area</span>
        {caption&&<span className="frame-caption">{caption}</span>}
        <button className="frame-handle" aria-label="Resize print area"
          onPointerDown={e=>{e.stopPropagation();startFrameResize(e.clientX,e.clientY);(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
          onPointerMove={e=>frameResize.current&&resizeFrame(e.clientX,e.clientY)}
          onPointerUp={()=>frameResize.current=null}
          onPointerCancel={()=>frameResize.current=null}/>
      </div>

      <button className="floating-control reset" onClick={resetView}><RotateCcw size={17}/><span>Reset</span></button>

      <nav className="bottom-tools">
        <button onClick={()=>setPanel('route')}><CalendarDays/><span>Route</span></button>
        <button className="primary" onClick={()=>setPanel('style')}><Palette/><span>Style</span></button>
        <button onClick={download}><Download/><span>Export</span></button>
      </nav>
    </section>

    {panel&&<div className="modal-shade" onClick={()=>setPanel(null)}>
      <section className={`panel ${panel==='menu'?'side-panel':''}`} onClick={e=>e.stopPropagation()}>
        <div className="panel-head"><h2>{panelTitle}</h2><button onClick={()=>setPanel(null)}><X/></button></div>

        {panel==='route'&&<>
          <div className="date-grid">
            <label><span>Start Date</span><div className="input-wrap"><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div></label>
            <label><span>Start Time</span><div className="input-wrap"><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></div></label>
            <label><span>End Date</span><div className="input-wrap"><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div></label>
            <label><span>End Time</span><div className="input-wrap"><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></div></label>
          </div>
          <button className="primary-action">Fetch Location Data</button>
          <p className="helper">The preview updates live as route data and styling change.</p>
        </>}

        {panel==='style'&&<>
          <div className="section-title"><SlidersHorizontal size={17}/> Route Style</div>
          <div className="style-preview">
            <svg viewBox="0 0 220 72"><path d="M10 56 C55 20 95 63 132 30 S190 20 210 12" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/></svg>
          </div>
          <div className="control-group">
            <label className="slider-control"><span><b>Line Width</b><em>{strokeWidth}px</em></span><input type="range" min="1" max="18" value={strokeWidth} onChange={e=>setStrokeWidth(+e.target.value)}/></label>
            <label className="row-control"><span><b>Color</b><small>Steel Blue</small></span><input className="color-well" type="color" value={stroke} onChange={e=>setStroke(e.target.value)}/></label>
            <label className="slider-control"><span><b>Simplification</b><em>{epsilon}m</em></span><input type="range" min="0" max="50" value={epsilon} onChange={e=>setEpsilon(+e.target.value)}/></label>
            <label className="switch-control"><span>Smooth Curves</span><input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/></label>
            <label className="switch-control"><span>Start & End Markers</span><input type="checkbox" checked={markers} onChange={e=>setMarkers(e.target.checked)}/></label>
          </div>
          <label className="caption"><span>Caption</span><input type="text" placeholder="Optional" value={caption} onChange={e=>setCaption(e.target.value)}/></label>
        </>}

        {panel==='layers'&&<>
          {(['standard','satellite','hybrid'] as Layer[]).map(l=>
            <button key={l} className="layer-option" onClick={()=>{setLayer(l);setPanel(null)}}>
              <span className={`layer-thumb ${l}`}/><span>{l[0].toUpperCase()+l.slice(1)}</span>{layer===l&&<Check size={20}/>}
            </button>
          )}
          <p className="helper">PWA preview styles for now. A live map provider can replace these visual placeholders later.</p>
        </>}

        {panel==='settings'&&<>
          <div className="settings-group">
            <button><span><Palette/> Accent Color</span><small>Steel Blue</small></button>
            <button onClick={()=>setPanel('layers')}><span><Layers/> Map Style</span><small>{layer}</small></button>
            <button><span><Settings/> Default Print Area</span><small>{framePreset}</small></button>
          </div>
          <div className="icon-setting">
            <img src="./app-icon-192.png"/>
            <div><b>App Icon</b><span>Brush Route · Steel Blue</span></div>
          </div>
        </>}

        {panel==='menu'&&<>
          <div className="menu-logo"><img src="./app-icon-192.png"/><div><b>Route Studio</b><span>Visual story of a route</span></div></div>
          <button className="menu-row" onClick={()=>setPanel('route')}><span><CalendarDays/> Route & Time</span><ChevronRight/></button>
          <button className="menu-row" onClick={()=>setPanel('style')}><span><Palette/> Style</span><ChevronRight/></button>
          <button className="menu-row" onClick={()=>setPanel('settings')}><span><Settings/> Settings</span><ChevronRight/></button>
          <button className="menu-row" onClick={download}><span><Download/> Export SVG</span><ChevronRight/></button>
        </>}
      </section>
    </div>}
  </main>
}