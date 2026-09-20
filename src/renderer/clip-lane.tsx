import {scrubTimeline} from './scrub'
import {isCompositionKey} from './keyboard'
import {useEffect,useRef,useState} from 'react'
import type {Track} from '../shared/domain'
import {trackClips,clipDuration,type Clip,type ClipAction} from '../shared/clips'
export function ClipLane({track,duration,selected,disabled,en,onSelect,onEdit,onSeek}:{track:Track;duration:number;selected:string;disabled:boolean;en:boolean;onSelect:(id:string)=>void;onEdit:(action:ClipAction)=>Promise<void>;onSeek:(at:number)=>void}){
 const [preview,setPreview]=useState<Clip|null>(null),drag=useRef<{clip:Clip;edge:'start'|'end';x:number;width:number}|null>(null)
 const cleanup=useRef<()=>void>(()=>{})
 useEffect(()=>()=>cleanup.current(),[])
 const clips=trackClips(track).filter(c=>!c.hidden),color=track.role==='other'?'#4dd6ba':track.color
 function adjusted(clip:Clip,edge:'start'|'end',delta:number){
  const sample=1/track.sampleRate,previous=Math.max(0,...clips.filter(c=>c.id!==clip.id&&c.offset<clip.offset).map(c=>c.offset+clipDuration(c))),next=Math.min(duration,...clips.filter(c=>c.id!==clip.id&&c.offset>clip.offset).map(c=>c.offset))
  if(edge==='start'){const start=Math.max(0,clip.start+previous-clip.offset,Math.min(clip.end-sample,clip.start+delta));return {...clip,start,offset:clip.offset+start-clip.start}}
  return {...clip,end:Math.max(clip.start+sample,Math.min(track.duration,clip.start+next-clip.offset,clip.end+delta))}
 }
 async function commit(clip:Clip,value:Clip){if(value.start!==clip.start||value.end!==clip.end)await onEdit({kind:'trim',trackId:track.id,clipId:clip.id,expected:clip,start:value.start,end:value.end})}
 return <div className="clip-lane" onPointerDown={e=>{if((e.target as HTMLElement).closest('.clip-handle'))return;const clipId=(e.target as HTMLElement).closest<HTMLElement>('[data-clip-id]')?.dataset.clipId;if(clipId&&!disabled)onSelect(clipId);scrubTimeline(e,duration,onSeek)}}>{clips.map(original=>{
  const clip=preview?.id===original.id?preview:original
  const start=Math.floor(clip.start/track.duration*track.peaks.length),end=Math.ceil(clip.end/track.duration*track.peaks.length),peaks=track.peaks.slice(start,end)
  return <div key={clip.id} className={`audio-clip ${selected===clip.id?'clip-selected':''}`} data-clip-id={clip.id} style={{left:`${clip.offset/duration*100}%`,width:`${clipDuration(clip)/duration*100}%`,'--clip-color':color} as React.CSSProperties} onClick={e=>{e.stopPropagation();if(!disabled){onSelect(clip.id);const r=e.currentTarget.getBoundingClientRect();onSeek(clip.offset+(e.clientX-r.left)/r.width*clipDuration(clip))}}} tabIndex={disabled?-1:0} role="button" aria-disabled={disabled} aria-label={clip.name} aria-pressed={selected===clip.id} onKeyDown={e=>{if(isCompositionKey(e.nativeEvent))return;if(!disabled&&e.key==='Enter'){e.preventDefault();e.stopPropagation();onSelect(clip.id)}}}>
   <span>{clip.name}</span><svg viewBox={`0 0 ${Math.max(1,peaks.length)} 100`} preserveAspectRatio="none"><path d={peaks.map((v,i)=>`M${i},${50-v*44}v${v*88}`).join(' ')} stroke={color} strokeWidth="1"/></svg>
   {(['start','end'] as const).map(edge=><div key={edge} className={`clip-handle ${edge}`} role="slider" aria-disabled={disabled} aria-label={`${clip.name} ${en?(edge==='start'?'Clip start':'Clip end'):(edge==='start'?'剪辑入点':'剪辑出点')}`} aria-valuemin={0} aria-valuemax={track.duration} aria-valuenow={clip[edge]} tabIndex={disabled?-1:0} onClick={e=>e.stopPropagation()} onPointerDown={e=>{e.stopPropagation();if(disabled||e.button!==0)return;e.preventDefault();cleanup.current();onSelect(clip.id);const target=e.currentTarget,pointerId=e.pointerId;target.setPointerCapture(pointerId);const d={clip:original,edge,x:e.clientX,width:target.parentElement!.parentElement!.getBoundingClientRect().width};drag.current=d
    const move=(event:PointerEvent)=>{if(event.pointerId===pointerId)setPreview(adjusted(d.clip,d.edge,(event.clientX-d.x)/d.width*duration))}
    const remove=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);drag.current=null}
    const up=(event:PointerEvent)=>{if(event.pointerId!==pointerId)return;remove();setPreview(null);void commit(d.clip,adjusted(d.clip,d.edge,(event.clientX-d.x)/d.width*duration))}
    const cancel=(event:PointerEvent)=>{if(event.pointerId!==pointerId)return;remove();setPreview(null)}
    cleanup.current=remove;window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel)
   }} onKeyDown={e=>{if(isCompositionKey(e.nativeEvent))return;if(disabled||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();void commit(original,adjusted(original,edge,(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?.1:.01)))}}/>)}
  </div>
 })}</div>
}
