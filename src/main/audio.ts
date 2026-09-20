import { spawn } from 'node:child_process'
import { open } from 'node:fs/promises'
import ffmpegPath from 'ffmpeg-static'
export function transcode(input: string, output: string): Promise<void> {
 if(!ffmpegPath) throw new Error('Audio decoder unavailable for this platform')
 const executable=ffmpegPath.replace('app.asar','app.asar.unpacked')
 return new Promise((resolve,reject)=>{
  const process=spawn(executable,['-nostdin','-v','error','-i',input,'-vn','-ac','2','-ar','44100','-c:a','pcm_f32le','-y',output],{windowsHide:true})
  let error='';process.stderr.on('data',b=>{error=(error+b.toString()).slice(-4000)})
  process.on('error',reject);process.on('close',code=>code===0?resolve():reject(new Error(error||'Audio decoding failed')))
 })
}
/** Scan PCM in bounded blocks; waveform generation must not duplicate the entire audio in RAM. */
export async function inspectWave(file: string) {
 const handle=await open(file,'r')
 try {
  const length=(await handle.stat()).size
  const read=async(position:number,size:number)=>{
   const buffer=Buffer.alloc(size);let received=0
   while(received<size){
    const result=await handle.read(buffer,received,size-received,position+received)
    if(!result.bytesRead)throw new Error('Truncated audio')
    received+=result.bytesRead
   }
   return buffer
  }
  const header=await read(0,12)
  if(header.toString('ascii',0,4)!=='RIFF'||header.toString('ascii',8,12)!=='WAVE')throw new Error('Invalid decoded audio')
  const end=header.readUInt32LE(4)+8
  if(end>length)throw new Error('Truncated audio')
  if(end<12)throw new Error('Invalid decoded audio')
  let rate=0,channels=0,bits=0,format=0,blockAlign=0,pcmStart=0,pcmSize=0
  for(let at=12;at+8<=end;){
   const chunk=await read(at,8),id=chunk.toString('ascii',0,4),size=chunk.readUInt32LE(4),begin=at+8
   if(begin+size>end)throw new Error('Truncated audio')
   if(id==='fmt '){
    if(size<16)throw new Error('Invalid audio format')
    const fmt=await read(begin,Math.min(size,40))
    format=fmt.readUInt16LE(0);channels=fmt.readUInt16LE(2);rate=fmt.readUInt32LE(4);blockAlign=fmt.readUInt16LE(12);bits=fmt.readUInt16LE(14)
    if(format===0xfffe){
     if(size<40||fmt.readUInt16LE(16)<22)throw new Error('Invalid extended audio format')
     const guid=fmt.subarray(24,40).toString('hex')
     if(guid==='0100000000001000800000aa00389b71')format=1
     else if(guid==='0300000000001000800000aa00389b71')format=3
    }
   }
   if(id==='data'){if(pcmStart)throw new Error('Multiple audio data chunks');pcmStart=begin;pcmSize=size}
   at=begin+size+(size%2)
  }
  if(!pcmStart||!rate||!channels||channels>32)throw new Error('Missing audio samples')
  if(!((format===1&&[16,24,32].includes(bits))||(format===3&&bits===32)))throw new Error('Unsupported PCM')
  const bytes=bits/8,frameBytes=bytes*channels
  if(blockAlign!==frameBytes)throw new Error('Invalid audio block alignment')
  if(!pcmSize||pcmSize%frameBytes)throw new Error('Incomplete audio frames')
  const frames=pcmSize/frameBytes,count=Math.min(1800,frames),peaks:number[]=Array(count).fill(0)
  const framesPerBlock=Math.max(1,Math.floor(1024*1024/frameBytes))
  let bin=0
  for(let first=0;first<frames;first+=framesPerBlock){
   const blockFrames=Math.min(framesPerBlock,frames-first),pcm=await read(pcmStart+first*frameBytes,blockFrames*frameBytes)
   for(let f=0;f<blockFrames;f++){
    while(bin<count-1&&first+f>=Math.floor((bin+1)*frames/count))bin++
    for(let c=0;c<channels;c++){
     const offset=(f*channels+c)*bytes
     const value=format===3?pcm.readFloatLE(offset):bits===16?pcm.readInt16LE(offset)/32768:bits===24?pcm.readIntLE(offset,3)/8388608:pcm.readInt32LE(offset)/2147483648
     if(!Number.isFinite(value))throw new Error('Non-finite audio sample')
     peaks[bin]=Math.max(peaks[bin],Math.min(1,Math.abs(value)))
    }
   }
  }
  return {duration:frames/rate,sampleRate:rate,channels,peaks}
 } finally {await handle.close()}
}
