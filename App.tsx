import { useMemo, useState } from 'react'
import { Download, Layers, LocateFixed, Menu, Minus, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { sampleTrack } from './data/sample'
import { douglasPeucker, filterNearby, fit, mercator, rotate } from './lib/geo'
import { exportSvg, linePath } from './lib/svg'
import type { AspectRatio } from './types'

const sizes:Record<AspectRatio,[number,number]>={square:[1000,1000],wide:[1500,500],tall:[800,1000]}

export default function App(){
  const [sheetOpen,setSheetOpen]=useState(true)
  const [stroke,setStroke]=useState('#153c66')
  const [strokeWidth,setStrokeWidth]=useState(6)
  const [smooth,setSmooth]=useState(true)
  const [markers,setMarkers]=useState(true)
  const [ratio,setRatio]=useState<AspectRatio>('square')
  const [caption,setCaption]=useState('')
  const [rotation,setRotation]=useState(0)
  const [epsilon,setEpsilon]=useState(8)
  const [zoom,setZoom]=useState(1)
  const [startDate,setStartDate]=useState('2026-08-01')
  const [startTime,setStartTime]=useState('09:00')
  const [endDate,setEndDate]=useState('2026-08-01')
  const [endTime,setEndTime]=useState('17:00')
  const [status,setStatus]=useState('Sample route loaded')

  const [w,h]=sizes[ratio]
  const projected=useMemo(()=>{
    const filtered=filterNearby(sampleTrack,10)
    const simplified=douglasPeucker(filtered.map(mercator),epsilon)
    const fitted=fit(simplified,w,h,.85)
    return rotate(fitted,rotation,w,h)
  },[w,h,rotation,epsilon])

  const d=linePath(projected,smooth)
  const first=projected[0],last=projected[projected.length-1]
  const download=()=>{
    const svg=exportSvg({points:projected,stroke,strokeWidth,smooth,startDot:markers,endArrow:markers,caption})
    const blob=new Blob([svg],{type:'image/svg+xml'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='route-studio.svg';a.click()
    URL.revokeObjectURL(url)
  }

  return <main className="app">
    <section className="map-stage">
      <div className="map-grid"/>
      <div className="map-water water-a"/><div className="map-water water-b"/>
      <div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/>
      <button className="floating menu" aria-label="Menu"><Menu size={22}/></button>
      <div className="brand">Route Studio</div>
      <button className="floating layers" aria-label="Layers"><Layers size={20}/></button>
      <button className="floating locate" aria-label="Locate"><LocateFixed size={20}/></button>
      <div className="zoomers">
        <button onClick={()=>setZoom(z=>Math.min(1.5,z+.1))}><Plus/></button>
        <button onClick={()=>setZoom(z=>Math.max(.65,z-.1))}><Minus/></button>
      </div>
      <div className="artboard" style={{aspectRatio:`${w}/${h}`,transform:`translate(-50%,-50%) scale(${zoom})`}}>
        <svg viewBox={`0 0 ${w} ${h}`} aria-label="Route artwork preview">
          <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          {markers&&first&&<circle cx={first.x} cy={first.y} r={strokeWidth*1.4+3} fill={stroke}/>}
          {markers&&last&&<circle cx={last.x} cy={last.y} r={strokeWidth*1.4+3} fill={stroke}/>}
          {caption&&<text x={w/2} y={h-18} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={Math.max(16,w/45)} fill={stroke}>{caption}</text>}
        </svg>
      </div>
      <div className="scale">500 ft</div>
    </section>

    <section className={`sheet ${sheetOpen?'open':'closed'}`}>
      <button className="grabber" aria-label="Toggle controls" onClick={()=>setSheetOpen(v=>!v)}><span/></button>
      <div className="sheet-head">
        <div><h1>Create Your Route</h1><p>{status}</p></div>
        <button className="preview" onClick={()=>setSheetOpen(false)}>Preview</button>
      </div>
      <div className="date-grid">
        <label>Start Date<div className="input-wrap"><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div></label>
        <label>Start Time<div className="input-wrap"><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></div></label>
        <label>End Date<div className="input-wrap"><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div></label>
        <label>End Time<div className="input-wrap"><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></div></label>
      </div>
      <button className="fetch" onClick={()=>setStatus(`Previewing ${startDate} ${startTime} → ${endDate} ${endTime}`)}><LocateFixed size={18}/> Fetch Location Data</button>
      <div className="section-title"><SlidersHorizontal size={18}/> Style</div>
      <div className="controls">
        <label>Line Thickness <b>{strokeWidth}px</b><input type="range" min="1" max="18" value={strokeWidth} onChange={e=>setStrokeWidth(+e.target.value)}/></label>
        <label className="color-row">Line Color <input type="color" value={stroke} onChange={e=>setStroke(e.target.value)}/></label>
        <label>Simplification <b>{epsilon}m</b><input type="range" min="0" max="50" value={epsilon} onChange={e=>setEpsilon(+e.target.value)}/></label>
        <div className="switch-row"><span>Smooth Bezier Curves</span><input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/></div>
        <div className="switch-row"><span>Start Circle & End Marker</span><input type="checkbox" checked={markers} onChange={e=>setMarkers(e.target.checked)}/></div>
      </div>
      <div className="ratio-row">
        {(['square','wide','tall'] as AspectRatio[]).map(r=><button key={r} className={ratio===r?'active':''} onClick={()=>setRatio(r)}>{r==='square'?'Square 1:1':r==='wide'?'Wide 3:1':'Tall 4:5'}</button>)}
      </div>
      <label className="caption">Caption<input type="text" placeholder="Optional caption" value={caption} onChange={e=>setCaption(e.target.value)}/></label>
      <div className="actions">
        <button onClick={()=>setRotation(v=>(v+90)%360)}><RotateCcw size={17}/> Rotate</button>
        <button className="export" onClick={download}><Download size={18}/> Export SVG</button>
      </div>
    </section>
  </main>
}