import {trackClips,clipSampleRange} from '../shared/clips'
import type {Track} from '../shared/domain'
/** Build a playback-only buffer; private source samples are never modified. */
export function clipBuffer(context:Pick<AudioContext,'createBuffer'>,source:AudioBuffer,track:Track,duration:number):AudioBuffer{
 const clips=trackClips(track).filter(c=>!c.hidden),rate=source.sampleRate||track.sampleRate
 if(clips.length===1&&clips[0].offset===0&&clips[0].start===0&&clipSampleRange(clips[0],rate).end===Math.round(source.duration*rate)&&duration<=source.duration)return source
 const out=context.createBuffer(source.numberOfChannels,Math.max(1,Math.ceil(duration*rate)),rate)
 for(const clip of clips){
  const {start,length}=clipSampleRange(clip,rate),at=Math.round(clip.offset*rate),count=Math.min(length,source.length-start,out.length-at)
  if(count<=0)continue
  for(let channel=0;channel<source.numberOfChannels;channel++){const src=source.getChannelData(channel),dst=out.getChannelData(channel);for(let i=0;i<count;i++)dst[at+i]+=src[start+i]}
 }
 return out
}
