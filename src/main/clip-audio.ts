import {spawn} from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import {clipSampleRange,type Clip} from '../shared/clips'
export function trimFilter(clip:Pick<Clip,'start'|'end'>,sampleRate:number){const {start,end}=clipSampleRange(clip,sampleRate);return `atrim=start_sample=${start}:end_sample=${end},asetpts=PTS-STARTPTS`}
export async function renderClip(input:string,output:string,clip:Clip,sampleRate:number,signal:AbortSignal){
 signal.throwIfAborted();if(!ffmpeg)throw new Error('Audio encoder unavailable')
 const executable=ffmpeg.replace('app.asar','app.asar.unpacked')
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(executable,['-nostdin','-v','error','-i',input,'-af',trimFilter(clip,sampleRate),'-c:a','pcm_f32le','-y',output],{windowsHide:true,signal})
  let errors='';child.stderr.on('data',b=>{errors=(errors+b.toString()).slice(-2000)})
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(errors||'Could not render clip')))
 })
}
