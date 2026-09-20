import {beatPosition,type Musical} from './domain'
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
