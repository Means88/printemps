import type {PointerEvent as ReactPointerEvent} from 'react'
/** Seek on press and keep seeking while the pointer is dragged across a timeline surface. Seeks are coalesced to one per frame. */
export function scrubTimeline(event:ReactPointerEvent<HTMLElement>,duration:number,onSeek:(at:number)=>void){
 if(event.button!==0)return false
 const element=event.currentTarget,pointerId=event.pointerId,rect=element.getBoundingClientRect()
 const at=(x:number)=>Math.max(0,Math.min(duration,(x-rect.left)/Math.max(1,rect.width)*duration))
 let pending:number|null=null,frame=0
 const flush=()=>{frame=0;if(pending!==null){onSeek(pending);pending=null}}
 const queue=(x:number)=>{pending=at(x);if(!frame)frame=requestAnimationFrame(flush)}
 const move=(e:PointerEvent)=>{if(e.pointerId===pointerId)queue(e.clientX)}
 const stop=(e:PointerEvent)=>{if(e.pointerId!==pointerId)return;element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',stop);element.removeEventListener('pointercancel',stop);if(frame){cancelAnimationFrame(frame);flush()}try{element.releasePointerCapture(pointerId)}catch{}}
 try{element.setPointerCapture(pointerId)}catch{}
 element.addEventListener('pointermove',move);element.addEventListener('pointerup',stop);element.addEventListener('pointercancel',stop)
 onSeek(at(event.clientX))
 return true
}
