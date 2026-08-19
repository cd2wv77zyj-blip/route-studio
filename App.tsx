import { useMemo, useRef, useState } from 'react'
import {
  Check, ChevronRight, Download, FileUp, Layers, Menu, Minus, Plus,
  RotateCcw, Settings, SlidersHorizontal, X
} from 'lucide-react'
import { sampleTrack } from './sample'
import { douglasPeucker, filterNearby, fit, mercator, rotate } from './geo'
import { exportSvg, linePath } from './svg'
import type { AspectRatio } from './types'

const sizes:Record<AspectRatio,[number,number]> = {
  square:[1000,1000], wide:[1500,500], tall:[800,1000]
}
type Layer = 'standard'|'satellite'|'hybrid'
const snapHeights = [16, 46, 82]

export default function App(){
  const [stroke,setStroke]=useState('#153c66')
  const [strokeWidth,setStrokeWidth]=useState(6)
  const [smooth,setSmooth]=useState(true)
  const [markers,setMarkers]=useState(true)
  const [ratio,setRatio]=useState<AspectRatio>('square')
  const [caption,setCaption]=useState('')
  const [rotation,setRotation]=useState(0)
  const [epsilon,setEpsilon]=useState(8)
  const [mapZoom,setMapZoom]=useState(1)
  const [layer,setLayer]=useState<Layer>('standard')
  const [startDate,setStartDate]=useState('2026-08-01')
  const [startTime,setStartTime]=useState('09:00')
  const [endDate,setEndDate]=useState('2026-08-01')
  const [endTime,setEndTime]=useState('17:00')
  const [sheetHeight,setSheetHeight]=useState(46)
  const [menuOpen,setMenuOpen]=useState(false)
  const [layersOpen,setLayersOpen]=useState(false)
  const dragStart=useRef<{y:number,h:number}|null>(null)
  const pinchStart=useRef<{distance:number,zoom:number}|null>(null)

  const [w,h]=sizes[ratio]
  const projected=useMemo(()=>{
    const filtered=filterNearby(sampleTrack,10)
    const simplified=douglasPeucker(filtered.map(mercator),epsilon)
    const fitted=fit(simplified,w,h,.85)
    return rotate(fitted,rotation,w,h)
  },[w,h,rotation,epsilon])

  const d=linePath(projected,smooth)
  const first=projected[0], last=projected[projected.length-1]

  const nearestSnap=(h:number)=>snapHeights.reduce((a,b)=>Math.abs(b-h)<Math.abs(a-h)?b:a)
  const dragMove=(clientY:number)=>{
    if(!dragStart.current) return
    const delta=(dragStart.current.y-clientY)/window.innerHeight*100
    setSheetHeight(Math.max(12,Math.min(88,dragStart.current.h+delta)))
  }
  const endDrag=()=>{
    if(!dragStart.current) return
    setSheetHeight(nearestSnap(sheetHeight))
    dragStart.current=null
  }

  const touchDistance=(touches:React.TouchList)=>{
    const a=touches[0],b=touches[1]
    return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)
  }
  const onMapTouchStart=(e:React.TouchEvent)=>{
    if(e.touches.length===2) pinchStart.current={distance:touchDistance(e.touches),zoom:mapZoom}
  }
  const onMapTouchMove=(e:React.TouchEvent)=>{
    if(e.touches.length===2 && pinchStart.current){
      e.preventDefault()
      const next=pinchStart.current.zoom*(touchDistance(e.touches)/pinchStart.current.distance)
      setMapZoom(Math.max(.7,Math.min(2.2,next)))
    }
  }
  const onMapTouchEnd=()=>{pinchStart.current=null}

  const download=()=>{
    const svg=exportSvg({points:projected,stroke,strokeWidth,smooth,startDot:markers,endArrow:markers,caption})
    const blob=new Blob([svg],{type:'image/svg+xml'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=url;a.download='route-studio.svg';a.click()
    URL.revokeObjectURL(url)
  }

  return <main className="app">
    <div className="landscape-lock">
      <div><strong>Route Studio is designed for portrait.</strong><span>Rotate your device to continue.</span></div>
    </div>

    <section className={`map-stage layer-${layer}`}
      onTouchStart={onMapTouchStart}
      onTouchMove={onMapTouchMove}
      onTouchEnd={onMapTouchEnd}>
      <div className="map-transform" style={{transform:`scale(${mapZoom}) rotate(${rotation}deg)`}}>
        <div className="map-grid"/>
        <div className="map-water water-a"/><div className="map-water water-b"/>
        <div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/>
        <div className="map-block block-a"/><div className="map-block block-b"/><div className="map-block block-c"/>
        <div className="artboard" style={{aspectRatio:`${w}/${h}`}}>
          <svg viewBox={`0 0 ${w} ${h}`} aria-label="Route preview">
            <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            {markers&&first&&<circle cx={first.x} cy={first.y} r={strokeWidth*1.4+3} fill={stroke}/>}
            {markers&&last&&<circle cx={last.x} cy={last.y} r={strokeWidth*1.4+3} fill={stroke}/>}
            {caption&&<text x={w/2} y={h-18} textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, Arial, sans-serif" fontSize={Math.max(16,w/45)} fill={stroke}>{caption}</text>}
          </svg>
        </div>
      </div>

      <button className="floating menu" aria-label="Open menu" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button>
      <div className="brand">Route Studio</div>
      <button className="floating layers" aria-label="Map layers" onClick={()=>setLayersOpen(true)}><Layers size={21}/></button>
      <div className="zoomers">
        <button aria-label="Zoom in" onClick={()=>setMapZoom(z=>Math.min(2.2,z+.12))}><Plus/></button>
        <button aria-label="Zoom out" onClick={()=>setMapZoom(z=>Math.max(.7,z-.12))}><Minus/></button>
      </div>
      <div className="scale">500 ft</div>
    </section>

    <section className="sheet" style={{height:`${sheetHeight}dvh`}}>
      <div className="drag-zone"
        onPointerDown={e=>{dragStart.current={y:e.clientY,h:sheetHeight};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
        onPointerMove={e=>dragStart.current&&dragMove(e.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}>
        <span className="grabber"/>
      </div>
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

        <div className="section-title">Canvas</div>
        <div className="segmented">
          {(['square','wide','tall'] as AspectRatio[]).map(r=><button key={r} className={ratio===r?'active':''} onClick={()=>setRatio(r)}>{r==='square'?'1:1':r==='wide'?'3:1':'4:5'}</button>)}
        </div>

        <label className="caption"><span>Caption</span><input type="text" placeholder="Optional" value={caption} onChange={e=>setCaption(e.target.value)}/></label>

        <div className="actions">
          <button onClick={()=>setRotation(v=>(v+90)%360)}><RotateCcw size={17}/> Rotate Map + Route</button>
          <button className="export" onClick={download}><Download size={18}/> Export SVG</button>
        </div>
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
        {(['standard','satellite','hybrid'] as Layer[]).map(l=>
          <button key={l} className="layer-option" onClick={()=>{setLayer(l);setLayersOpen(false)}}>
            <span className={`layer-thumb ${l}`}/><span>{l[0].toUpperCase()+l.slice(1)}</span>{layer===l&&<Check size={20}/>}
          </button>
        )}
        <p className="layer-note">These are visual preview styles in PWA v1. Live map tiles will be connected in a later data-provider pass.</p>
      </div>
    </div>}
  </main>
}