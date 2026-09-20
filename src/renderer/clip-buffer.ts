import {trackClips,clipSampleRange} from '../shared/clips'
import type {Track} from '../shared/domain'
/** Build a playback-only buffer; private source samples are never modified. */
export function clipBuffer(context:Pick<AudioContext,'createBuffer'>,source:AudioBuffer,track:Track,duration:number):AudioBuffer{
 const clips=trackClips(track).filter(c=>!c.hidden),rate=source.sampleRate||track.sampleRate
 // Splitting alone changes clip metadata, not the audible samples. Reuse the
 // decode even for many adjacent clips instead of allocating another song.
 let covered=0
 const unchanged=[...clips].sort((a,b)=>a.offset-b.offset).every(clip=>{
  const {start,end}=clipSampleRange(clip,rate)
  if(start!==covered||Math.round(clip.offset*rate)!==start)return false
  covered=end;return true
 })
 if(unchanged&&covered===Math.round(source.duration*rate)&&duration<=source.duration)return source
 const out=context.createBuffer(source.numberOfChannels,Math.max(1,Math.ceil(duration*rate)),rate)
 for(const clip of clips){
  const {start,length}=clipSampleRange(clip,rate),at=Math.round(clip.offset*rate),count=Math.min(length,source.length-start,out.length-at)
  if(count<=0)continue
  for(let channel=0;channel<source.numberOfChannels;channel++){const src=source.getChannelData(channel),dst=out.getChannelData(channel);for(let i=0;i<count;i++)dst[at+i]+=src[start+i]}
 }
 return out
}
