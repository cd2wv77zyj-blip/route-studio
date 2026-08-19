import { useMemo, useRef, useState } from 'react'
import {
  Check, ChevronRight, Download, FileUp, Layers, Menu, Minus, Plus,
  Settings, SlidersHorizontal, X
} from 'lucide-react'
import { sampleTrack } from './sample'
import { douglasPeucker, filterNearby, fit, mercator } from './geo'
import { exportSvg, linePath } from './svg'
import type { XYPoint } from './types'

type Layer = 'standard'|'satellite'|'hybrid'
type FramePreset = 'square'|'wide'|'tall'|'freeform'
const snapHeights = [16,46,82]

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
  const [stroke,setStroke]=useState('#153c66')
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
  const [sheetHeight,setSheetHeight]=useState(46)
  const [menuOpen,setMenuOpen]=useState(false)
  const [layersOpen,setLayersOpen]=useState(false)

  // Geographic scene transform. This is independent from the print frame.
  const [mapZoom,setMapZoom]=useState(1)
  const [mapRotation,setMapRotation]=useState(0)
  const [pan,setPan]=useState({x:0,y:0})

  // Print frame is an overlay/crop guide only.
  const [framePreset,setFramePreset]=useState<FramePreset>('square')
  const [frameSize,setFrameSize]=useState({w:78,h:43})

  const sheetDrag=useRef<{y:number,h:number}|null>(null)
  const frameDrag=useRef<{x:number,y:number,w:number,h:number}|null>(null)
  const gesture=useRef<any>(null)

  const basePoints=useMemo(()=>{
    const filtered=filterNearby(sampleTrack,10)
    const simplified=douglasPeucker(filtered.map(mercator),epsilon)
    return fit(simplified,1000,1000,.70)
  },[epsilon])

  const transformed=useMemo(
    ()=>transformPoints(basePoints,mapZoom,mapRotation,pan.x,pan.y),
    [basePoints,mapZoom,mapRotation,pan]
  )

  const d=linePath(transformed,smooth)
  const first=transformed[0],last=transformed[transformed.length-1]

  const applyPreset=(preset:FramePreset)=>{
    setFramePreset(preset)
    if(preset==='square') setFrameSize({w:78,h:43})
    if(preset==='wide') setFrameSize({w:88,h:29})
    if(preset==='tall') setFrameSize({w:70,h:55})
    // Freeform keeps the current dimensions so there is no visual jump.
  }

  const nearestSnap=(height:number)=>snapHeights.reduce((a,b)=>Math.abs(b-height)<Math.abs(a-height)?b:a)
  const dragSheet=(clientY:number)=>{
    if(!sheetDrag.current)return
    const delta=(sheetDrag.current.y-clientY)/window.innerHeight*100
    setSheetHeight(Math.max(12,Math.min(88,sheetDrag.current.h+delta)))
  }
  const endSheetDrag=()=>{
    if(!sheetDrag.current)return
    setSheetHeight(nearestSnap(sheetHeight));sheetDrag.current=null
  }

  const dist=(a:React.Touch,b:React.Touch)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)
  const ang=(a:React.Touch,b:React.Touch)=>Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI
  const onMapTouchStart=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest('.frame-handle')) return
    if(e.touches.length===1){
      const t=e.touches[0]
      gesture.current={mode:'pan',x:t.clientX,y:t.clientY,panX:pan.x,panY:pan.y,zoom:mapZoom,rotation:mapRotation}
    }else if(e.touches.length>=2){
      const a=e.touches[0],b=e.touches[1]
      gesture.current={mode:'pinch',distance:dist(a,b),angle:ang(a,b),zoom:mapZoom,rotation:mapRotation,panX:pan.x,panY:pan.y}
    }
  }
  const onMapTouchMove=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest('.frame-handle')) return
    e.preventDefault()
    const g=gesture.current
    if(!g)return
    if(e.touches.length===1 && g.mode==='pan'){
      const t=e.touches[0]
      setPan({x:g.panX+(t.clientX-g.x)*2.0,y:g.panY+(t.clientY-g.y)*2.0})
    }else if(e.touches.length>=2){
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
    if(e.touches.length===0)gesture.current=null
    else if(e.touches.length===1){
      const t=e.touches[0]
      gesture.current={mode:'pan',x:t.clientX,y:t.clientY,panX:pan.x,panY:pan.y,zoom:mapZoom,rotation:mapRotation}
    }
  }

  const resetView=()=>{setMapZoom(1);setMapRotation(0);setPan({x:0,y:0})}

  const startFrameResize=(clientX:number,clientY:number)=>{
    setFramePreset('freeform')
    frameDrag.current={x:clientX,y:clientY,w:frameSize.w,h:frameSize.h}
  }
  const resizeFrame=(clientX:number,clientY:number)=>{
    const g=frameDrag.current;if(!g)return
    const dw=(clientX-g.x)/window.innerWidth*200
    const dh=(clientY-g.y)/window.innerHeight*200
    setFrameSize({
      w:Math.max(34,Math.min(92,g.w+dw)),
      h:Math.max(20,Math.min(68,g.h+dh))
    })
  }

  // Export is based on the current route transform. The on-screen dotted frame is a composition guide;
  // route points remain intact outside it while editing.
  const download=()=>{
    const svg=exportSvg({points:transformed,stroke,strokeWidth,smooth,startDot:markers,endArrow:markers,caption})
    const blob=new Blob([svg],{type:'image/svg+xml'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='route-studio.svg';a.click()
    URL.revokeObjectURL(url)
  }

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
      </div>

      {/* Route is deliberately NOT clipped by the frame. */}
      <svg className="route-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Route preview">
        <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        {markers&&first&&<circle cx={first.x} cy={first.y} r={strokeWidth*1.4+3} fill={stroke}/>}
        {markers&&last&&<circle cx={last.x} cy={last.y} r={strokeWidth*1.4+3} fill={stroke}/>}
      </svg>

      <div className={`print-frame ${framePreset==='freeform'?'freeform':''}`}
        style={{width:`${frameSize.w}vw`,height:`${frameSize.h}vh`}}>
        <span className="frame-label">{framePreset==='freeform'?'Freeform Print Area':'Print Area'}</span>
        {caption&&<span className="frame-caption">{caption}</span>}
        <button className="frame-handle" aria-label="Resize print area"
          onPointerDown={e=>{e.stopPropagation();startFrameResize(e.clientX,e.clientY);(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
          onPointerMove={e=>{if(frameDrag.current){e.stopPropagation();resizeFrame(e.clientX,e.clientY)}}}
          onPointerUp={()=>frameDrag.current=null}
          onPointerCancel={()=>frameDrag.current=null}/>
      </div>

      <button className="floating menu" aria-label="Open menu" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button>
      <div className="brand">Route Studio</div>
      <button className="floating layers" aria-label="Map layers" onClick={()=>setLayersOpen(true)}><Layers size={21}/></button>
      <div className="zoomers">
        <button aria-label="Zoom in" onClick={()=>setMapZoom(z=>Math.min(4,z+.15))}><Plus/></button>
        <button aria-label="Zoom out" onClick={()=>setMapZoom(z=>Math.max(.5,z-.15))}><Minus/></button>
      </div>
      <button className="reset-map" onClick={resetView}>Reset View</button>
      <div className="gesture-hint">Drag · Pinch · Rotate</div>
      <div className="scale">500 ft</div>
    </section>

    <section className="sheet" style={{height:`${sheetHeight}dvh`}}>
      <div className="drag-zone"
        onPointerDown={e=>{sheetDrag.current={y:e.clientY,h:sheetHeight};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
        onPointerMove={e=>sheetDrag.current&&dragSheet(e.clientY)}
        onPointerUp={endSheetDrag}
        onPointerCancel={endSheetDrag}><span className="grabber"/></div>

      <div className="sheet-content">
        <div className="sheet-head"><h1>Create Your Route</h1></div>
        <div className="date-grid">
          <label><span>Start Date</span><div className="input-wrap"><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div></label>
          <label><span>Start Time</span><div className="input-wrap"><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></div></label>
          <label><span>End Date</span><div className="input-wrap"><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div></label>
          <label><span>End Time</span><div className="input-wrap"><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></div></label>
        </div>
        <button className="fetch"><span>Fetch Location Data</span></button>

        <div className="section-title"><SlidersHorizontal size={17}/> Style</div>
        <div className="control-group">
          <label className="slider-control"><span><b>Line Thickness</b><em>{strokeWidth}px</em></span><input type="range" min="1" max="18" value={strokeWidth} onChange={e=>setStrokeWidth(+e.target.value)}/></label>
          <label className="row-control"><span><b>Line Color</b></span><input className="color-well" type="color" value={stroke} onChange={e=>setStroke(e.target.value)}/></label>
          <label className="slider-control"><span><b>Simplification</b><em>{epsilon}m</em></span><input type="range" min="0" max="50" value={epsilon} onChange={e=>setEpsilon(+e.target.value)}/></label>
          <label className="switch-control"><span>Smooth Curves</span><input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/></label>
          <label className="switch-control"><span>Start & End Markers</span><input type="checkbox" checked={markers} onChange={e=>setMarkers(e.target.checked)}/></label>
        </div>

        <div className="section-title">Print Area</div>
        <div className="segmented four">
          {(['square','wide','tall','freeform'] as FramePreset[]).map(r=><button key={r} className={framePreset===r?'active':''} onClick={()=>applyPreset(r)}>
            {r==='square'?'1:1':r==='wide'?'3:1':r==='tall'?'4:5':'Free'}
          </button>)}
        </div>
        <p className="helper">{framePreset==='freeform'?'Drag the lower-right corner of the dotted frame to resize it.':'Changing the print area no longer refits or resets the route.'}</p>

        <label className="caption"><span>Caption</span><input type="text" placeholder="Optional" value={caption} onChange={e=>setCaption(e.target.value)}/></label>

        <div className="actions single"><button className="export" onClick={download}><Download size={18}/> Export SVG</button></div>
      </div>
    </section>

    {menuOpen&&<div className="modal-shade" onClick={()=>setMenuOpen(false)}>
      <aside className="side-menu" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h2>Route Studio</h2><button onClick={()=>setMenuOpen(false)}><X/></button></div>
        <button><span><FileUp size={19}/> Import Location Data</span><ChevronRight size={18}/></button>
        <button><span><Download size={19}/> Exports</span><ChevronRight size={18}/></button>
        <button><span><Settings size={19}/> Settings</span><ChevronRight size={18}/></button>
        <p>Route data stays on this device in this prototype.</p>
      </aside>
    </div>}

    {layersOpen&&<div className="modal-shade" onClick={()=>setLayersOpen(false)}>
      <div className="layer-sheet" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h2>Map Style</h2><button onClick={()=>setLayersOpen(false)}><X/></button></div>
        {(['standard','satellite','hybrid'] as Layer[]).map(l=><button key={l} className="layer-option" onClick={()=>{setLayer(l);setLayersOpen(false)}}>
          <span className={`layer-thumb ${l}`}/><span>{l[0].toUpperCase()+l.slice(1)}</span>{layer===l&&<Check size={20}/>}
        </button>)}
        <p className="layer-note">Visual preview styles for this prototype. Live map tiles come next.</p>
      </div>
    </div>}
  </main>
}