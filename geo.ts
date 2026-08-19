import type { GPSPoint, XYPoint } from './types'

const R = 6378137

export function haversineMeters(a: GPSPoint, b: GPSPoint) {
  const toRad = (v:number) => v * Math.PI / 180
  const dLat = toRad(b.lat-a.lat)
  const dLon = toRad(b.lon-a.lon)
  const la1 = toRad(a.lat), la2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function filterNearby(points: GPSPoint[], minMeters=10) {
  if (!points.length) return []
  const out = [points[0]]
  for (let i=1;i<points.length;i++) {
    if (haversineMeters(out[out.length-1], points[i]) >= minMeters) out.push(points[i])
  }
  return out
}

export function mercator(p: GPSPoint): XYPoint {
  const lon = p.lon * Math.PI / 180
  const lat = Math.max(-85.05112878, Math.min(85.05112878, p.lat)) * Math.PI / 180
  return { x: R * lon, y: R * Math.log(Math.tan(Math.PI/4 + lat/2)) }
}

function distToSegment(p:XYPoint, a:XYPoint, b:XYPoint) {
  const dx=b.x-a.x, dy=b.y-a.y
  if (dx===0 && dy===0) return Math.hypot(p.x-a.x,p.y-a.y)
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)))
  return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))
}

export function douglasPeucker(points:XYPoint[], epsilon:number):XYPoint[] {
  if (points.length < 3) return points
  let max=0,index=0
  for(let i=1;i<points.length-1;i++){
    const d=distToSegment(points[i],points[0],points[points.length-1])
    if(d>max){max=d;index=i}
  }
  if(max>epsilon){
    const left=douglasPeucker(points.slice(0,index+1),epsilon)
    const right=douglasPeucker(points.slice(index),epsilon)
    return [...left.slice(0,-1),...right]
  }
  return [points[0],points[points.length-1]]
}

export function bounds(points:XYPoint[]) {
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y)
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}
}

export function fit(points:XYPoint[], width:number, height:number, fill=.85):XYPoint[] {
  if(!points.length) return []
  const b=bounds(points)
  const pw=Math.max(1,b.maxX-b.minX), ph=Math.max(1,b.maxY-b.minY)
  const s=Math.min(width*fill/pw,height*fill/ph)
  const ox=(width-pw*s)/2, oy=(height-ph*s)/2
  return points.map(p=>({x:ox+(p.x-b.minX)*s,y:height-(oy+(p.y-b.minY)*s)}))
}

export function rotate(points:XYPoint[], degrees:number, width:number, height:number) {
  const r=degrees*Math.PI/180, cx=width/2, cy=height/2
  return points.map(p=>{
    const dx=p.x-cx,dy=p.y-cy
    return {x:cx+dx*Math.cos(r)-dy*Math.sin(r),y:cy+dx*Math.sin(r)+dy*Math.cos(r)}
  })
}