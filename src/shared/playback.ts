import type {Musical} from './domain'
export type LoopRange={start:number;end:number}
export function validateLoop(range:LoopRange|null,duration:number){
 if(range&&(!Number.isFinite(range.start)||!Number.isFinite(range.end)||range.start<0||range.end>duration||range.end-range.start<.01))throw new Error('Loop must be at least 0.01 seconds and within the audio')
 return range
}
export function playbackPosition(elapsed:number,offset:number,duration:number,loop:LoopRange|null){
 const raw=Math.max(0,offset+Math.max(0,elapsed))
 return loop&&raw>=loop.end?loop.start+(raw-loop.end)%(loop.end-loop.start):Math.min(duration,raw)
}
/** Find beat occurrences in a short audio-clock horizon, including loop wraps. */
export function clickEvents(from:number,to:number,music:Musical,position:(time:number)=>number,duration:number,loop:LoopRange|null){
 if(!music.bpm)return []
 const [numerator,denominator]=music.meter.split('/').map(Number),interval=60/music.bpm*4/denominator
 const events:{at:number;beat:number}[]=[];let cursor=from
 for(let safety=0;cursor<to&&safety<1000;safety++){
  const pos=position(cursor),end=loop?.end??duration
  if(pos>=end-1e-8&&!loop)break
  const index=Math.max(0,Math.ceil((pos-music.firstBeat-1e-8)/interval)),beatTime=music.firstBeat+index*interval
  const boundary=cursor+Math.max(1e-7,end-pos)
  const at=cursor+beatTime-pos
  if(beatTime>=end-1e-8){if(!loop)break;cursor=boundary+1e-9;continue}
  if(at>=to-1e-8)break
  if(at>=from-1e-8)events.push({at:Math.max(from,at),beat:index%numerator})
  cursor=at+1e-7
 }
 return events
}
