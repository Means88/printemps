import {beatPosition,type Musical} from './domain'
/** Musical ruler labels sit on actual downbeats, including a non-zero first beat. */
export function rulerTicks(duration:number,music:Musical,format:'time'|'beats',maxLabels=7){
 if(!Number.isFinite(duration)||duration<=0)return [{seconds:0,label:formatPosition(0,music,format)}]
 const limit=Math.max(2,Math.floor(maxLabels))
 if(format==='beats'&&music.bpm){
  const [numerator,denominator]=music.meter.split('/').map(Number)
  const barSeconds=60/music.bpm*4/denominator*numerator
  const count=Math.floor((duration-music.firstBeat)/barSeconds)+1
  if(count<=0)return []
  const stride=Math.max(1,Math.ceil(count/limit))
  const ticks:{seconds:number;label:string}[]=[]
  for(let bar=0;bar<count;bar+=stride)ticks.push({seconds:music.firstBeat+bar*barSeconds,label:`${bar+1}.1`})
  return ticks
 }
 return Array.from({length:limit},(_,i)=>({seconds:i*duration/(limit-1),label:formatPosition(i*duration/(limit-1),music,'time')+(duration/(limit-1)<1?'.'+Math.floor((i*duration/(limit-1)%1)*1000).toString().padStart(3,'0'):'')}))
}
export function formatPosition(seconds:number,music:Musical,format:'time'|'beats'){
 if(format==='beats'){
  const position=beatPosition(seconds,music)
  if(position)return position.bar===0?'—':`${position.bar}.${position.beat}`
 }
 const value=Math.max(0,seconds),hours=Math.floor(value/3600),minutes=Math.floor(value/60)%60,remainder=Math.floor(value%60)
 return `${hours?hours.toString().padStart(2,'0')+':':''}${minutes.toString().padStart(2,'0')}:${remainder.toString().padStart(2,'0')}`
}
/** Limit drawn lines at full-song zoom; audio click scheduling remains independent. */
export function beatGrid(duration:number,music:Musical,maxLines=300){
 if(!music.bpm||duration<=0||maxLines<1)return []
 const [numerator,denominator]=music.meter.split('/').map(Number),interval=60/music.bpm*4/denominator
 const total=Math.floor((duration-music.firstBeat)/interval)+1
 if(total<=0)return []
 const stride=total>maxLines?numerator*Math.ceil(total/maxLines/numerator):1
 const lines:{seconds:number;bar:boolean}[]=[]
 for(let i=0;i<total;i+=stride)lines.push({seconds:music.firstBeat+i*interval,bar:i%numerator===0})
 return lines
}

/** Tracks the workspace lists; consumed or user-hidden tracks are excluded so Home and the workspace agree. */
export function visibleTrackCount(project:{tracks:{hidden?:boolean}[]}){
 return project.tracks.filter(track=>!track.hidden).length
}
