import { test, expect } from 'vitest'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { inspectWave, transcode } from '../src/main/audio'

function floatWave(samples: number[]) {
 const b=Buffer.alloc(44+samples.length*4)
 b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16)
 b.writeUInt16LE(3,20);b.writeUInt16LE(2,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(352800,28)
 b.writeUInt16LE(8,32);b.writeUInt16LE(32,34);b.write('data',36);b.writeUInt32LE(samples.length*4,40)
 samples.forEach((s,i)=>b.writeFloatLE(s,44+i*4));return b
}
test('float separation outputs preserve headroom and yield bounded waveform peaks',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-audio-'))
 try {
  const file=path.join(dir,'worker.wav'),converted=path.join(dir,'decoded.wav')
  const original=floatWave([1.25,-.5,.125,-.25])
  await writeFile(file,original)
  expect(await inspectWave(file)).toEqual({duration:2/44100,sampleRate:44100,channels:2,peaks:[1,.25]})
  await transcode(file,converted)
  expect(await inspectWave(converted)).toEqual(await inspectWave(file))
  const decoded=await readFile(converted),at=decoded.indexOf(Buffer.from('data'))
  expect(decoded.readFloatLE(at+8)).toBe(1.25)
  expect(await readFile(file)).toEqual(original)
  await writeFile(file,floatWave([NaN,0]));await expect(inspectWave(file)).rejects.toThrow('Non-finite')
  await writeFile(file,floatWave([0]));await expect(inspectWave(file)).rejects.toThrow('Incomplete')
  await writeFile(file,original.subarray(0,original.length-1));await expect(inspectWave(file)).rejects.toThrow('Truncated')
 } finally {await rm(dir,{recursive:true,force:true})}
})

test('streamed peaks preserve bin boundaries across read blocks and skip padded metadata',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-wave-stream-'))
 try {
  const frames=270013,samples=Array.from({length:frames*2},(_,i)=>((i*31)%1000)/1024)
  const wave=floatWave(samples)
  // An odd-sized metadata chunk exercises RIFF padding before audio data.
  const junk=Buffer.from([74,85,78,75,3,0,0,0,1,2,3,0])
  const extended=Buffer.concat([wave.subarray(0,36),junk,wave.subarray(36)])
  extended.writeUInt32LE(extended.length-8,4)
  const file=path.join(dir,'large.wav');await writeFile(file,extended)
  const expected=Array.from({length:1800},(_,bin)=>{
   let peak=0
   for(let f=Math.floor(bin*frames/1800);f<Math.floor((bin+1)*frames/1800);f++)peak=Math.max(peak,samples[f*2],samples[f*2+1])
   return peak
  })
  expect(await inspectWave(file)).toEqual({duration:frames/44100,sampleRate:44100,channels:2,peaks:expected})
  extended.writeUInt16LE(4,32);await writeFile(file,extended)
  await expect(inspectWave(file)).rejects.toThrow('block alignment')
 } finally {await rm(dir,{recursive:true,force:true})}
})
