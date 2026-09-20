import {expect,test} from 'vitest'
import {writeFileSync} from 'node:fs'
import {clipBuffer} from '../src/renderer/clip-buffer'
import type {Track} from '../src/shared/domain'

// Opt-in because this allocates about 1.5 GB of real PCM arrays. This measures
// the buffer builder, not Electron decoding, device playback or OS reclamation.
test.skipIf(process.env.PRINTEMPS_TEST_CLIP_MEMORY!=='1')('ten-minute multitrack splits reuse PCM and trimming preserves source samples',()=>{
 const rate=44100,duration=600,channels=2,length=rate*duration
 let allocatedBytes=0
 const context={createBuffer:(count:number,size:number,sampleRate:number)=>{
  const data=Array.from({length:count},()=>new Float32Array(size))
  allocatedBytes+=count*size*4
  return {length:size,numberOfChannels:count,sampleRate,duration:size/sampleRate,getChannelData:(channel:number)=>data[channel]} as unknown as AudioBuffer
 }}
 const baseline=process.memoryUsage(),started=performance.now()
 const tracks=Array.from({length:6},(_,index)=>{
  const source=context.createBuffer(channels,length,rate)
  for(let channel=0;channel<channels;channel++)source.getChannelData(channel).fill((index+1)/16)
  const track:Track={id:`track-${index}`,assetId:`asset-${index}`,name:`Track ${index}`,role:'stem',stem:'bass',color:'#abc',gain:0,muted:false,solo:false,peaks:[],duration,sampleRate:rate,channels,
   clips:Array.from({length:60},(_,part)=>({id:`clip-${index}-${part}`,name:`Part ${part}`,start:part*10,end:(part+1)*10,offset:part*10}))}
  return {source,track}
 })
 const decodedBytes=allocatedBytes
 for(let pass=0;pass<20;pass++)for(const {source,track} of tracks)expect(clipBuffer(context,source,track,duration)).toBe(source)
 expect(allocatedBytes).toBe(decodedBytes)
 const {source,track}=tracks[0],clips=track.clips!.map((clip,index)=>index===30?{...clip,start:305,offset:305}:clip)
 const trimmed=clipBuffer(context,source,{...track,clips},duration)
 expect(allocatedBytes-decodedBytes).toBe(channels*length*4)
 for(let channel=0;channel<channels;channel++){
  const samples=trimmed.getChannelData(channel)
  expect(samples[300*rate-1]).toBe(1/16)
  expect(samples[300*rate]).toBe(0)
  expect(samples[305*rate-1]).toBe(0)
  expect(samples[305*rate]).toBe(1/16)
  expect(samples[length-1]).toBe(1/16)
  expect(source.getChannelData(channel)[300*rate]).toBe(1/16)
 }
 const final=process.memoryUsage()
 const report=JSON.stringify({scenario:'6 stereo tracks, 10 minutes, 60 clips each, 20 rebuilds, one trim',decodedBytes,allocatedBytes,baselineRss:baseline.rss,finalRss:final.rss,arrayBuffers:final.arrayBuffers,elapsedMs:Math.round(performance.now()-started)},null,2)
 console.info(report)
 if(process.env.PRINTEMPS_MEMORY_REPORT)writeFileSync(process.env.PRINTEMPS_MEMORY_REPORT,report+'\n')
},60_000)
