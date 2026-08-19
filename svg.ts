import type { XYPoint } from './types'

const n=(v:number)=>Number(v.toFixed(2))

export function linePath(points:XYPoint[], smooth:boolean) {
  if(!points.length) return ''
  if(!smooth || points.length<3) return `M ${n(points[0].x)} ${n(points[0].y)} ` + points.slice(1).map(p=>`L ${n(p.x)} ${n(p.y)}`).join(' ')
  let d=`M ${n(points[0].x)} ${n(points[0].y)}`
  for(let i=1;i<points.length-1;i++){
    const mid={x:(points[i].x+points[i+1].x)/2,y:(points[i].y+points[i+1].y)/2}
    d+=` Q ${n(points[i].x)} ${n(points[i].y)} ${n(mid.x)} ${n(mid.y)}`
  }
  const last=points[points.length-1]
  return d+` T ${n(last.x)} ${n(last.y)}`
}

export function exportSvg(opts:{
  points:XYPoint[], stroke:string, strokeWidth:number, smooth:boolean,
  startDot:boolean, endArrow:boolean, caption:string
}) {
  const {points,stroke,strokeWidth,smooth,startDot,endArrow,caption}=opts
  if(points.length<2) return ''
  const pad=Math.max(4,strokeWidth*2)
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y)
  let minX=Math.min(...xs)-pad,maxX=Math.max(...xs)+pad,minY=Math.min(...ys)-pad,maxY=Math.max(...ys)+pad
  const captionGap=caption?26:0
  const width=maxX-minX,height=maxY-minY+captionGap
  const path=linePath(points,smooth)
  const first=points[0], last=points[points.length-1], prev=points[points.length-2]
  const angle=Math.atan2(last.y-prev.y,last.x-prev.x)
  const al=12+strokeWidth, aw=5+strokeWidth/2
  const ax1=last.x-Math.cos(angle)*al+Math.sin(angle)*aw
  const ay1=last.y-Math.sin(angle)*al-Math.cos(angle)*aw
  const ax2=last.x-Math.cos(angle)*al-Math.sin(angle)*aw
  const ay2=last.y-Math.sin(angle)*al+Math.cos(angle)*aw
  const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(minX)} ${n(minY)} ${n(width)} ${n(height)}">
  <path d="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
${startDot?`  <circle cx="${n(first.x)}" cy="${n(first.y)}" r="${n(Math.max(3,strokeWidth*1.25))}" fill="${stroke}"/>`:''}
${endArrow?`  <path d="M ${n(last.x)} ${n(last.y)} L ${n(ax1)} ${n(ay1)} L ${n(ax2)} ${n(ay2)} Z" fill="${stroke}"/>`:''}
${caption?`  <text x="${n((minX+maxX)/2)}" y="${n(maxY+20)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${stroke}">${esc(caption)}</text>`:''}
</svg>`
}