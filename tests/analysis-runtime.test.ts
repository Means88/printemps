import {test,expect} from 'vitest'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {runAnalysis} from '../src/main/analysis'
import {summarizeAnalysis} from '../src/shared/analysis'
const resources=process.env.PRINTEMPS_TEST_RESOURCES
const enabled=process.env.PRINTEMPS_INTEGRATION==='1'
test.runIf(enabled)('real bundled Beat This and Essentia WASM produce usable recommendations',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-real-analysis-'))
 try{
  const frames=44100*16,b=Buffer.alloc(44+frames*8)
  b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(3,20);b.writeUInt16LE(2,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(352800,28);b.writeUInt16LE(8,32);b.writeUInt16LE(32,34);b.write('data',36);b.writeUInt32LE(b.length-44,40)
  for(let i=0;i<frames;i++){
   const time=i/44100,beat=Math.floor((time-.1)/.5),within=time-(beat*.5+.1)
   const click=beat>=0&&within<.1?.35*Math.sin(2*Math.PI*(beat%4===0?130:800)*within)*Math.exp(-within*65):0
   const value=click+[261.63,329.63,392].reduce((sum,f)=>sum+Math.sin(2*Math.PI*f*time)*.045,0)
   b.writeFloatLE(value,44+i*8);b.writeFloatLE(value,48+i*8)
  }
  const input=path.join(root,'fixture.wav');await writeFile(input,b)
  const base=resources?path.resolve(resources):path.resolve('.runtime')
  const python=path.join(base,'python',process.platform==='win32'?'python.exe':'bin/python3'),script=resources?path.join(base,'worker/analyze.py'):path.resolve('worker/analyze.py')
  const stages:string[]=[]
  const result=await runAnalysis(python,script,input,new AbortController().signal,stage=>stages.push(stage))
  expect(result.errors?.beats).toBeUndefined();expect(result.errors?.key).toBeUndefined()
  expect(stages).toEqual(['beats','key'])
  const summary=summarizeAnalysis(result,16)
  expect(summary.recommendation.bpm).toBeCloseTo(120,0);expect(summary.recommendation.meter).toBe('4/4');expect(summary.recommendation.key).toBe('C major')
  expect(summary.recommendation.firstBeat).toBeGreaterThanOrEqual(0)
 }finally{await rm(root,{recursive:true,force:true})}
},120000)
