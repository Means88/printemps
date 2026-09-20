import { test,expect } from 'vitest'
import { mkdtemp,writeFile,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runSeparation, type SeparationRequest } from '../src/main/inference-worker'

test('worker accepts complete ordered results, rejects escaped paths and incomplete exit, and cancels a live process',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-worker-')),script=path.join(dir,'fake.cjs')
 const request:SeparationRequest={input:'source.wav',output:dir,device:'cpu',targets:[{id:'drums',config:'config',weight:'weight'}]}
 const run=(signal=new AbortController().signal)=>runSeparation(process.execPath,script,request,signal,()=>{},[])
 try{
  await writeFile(script,`process.stdin.once('data',b=>{const r=JSON.parse(b);console.log(JSON.stringify({type:'complete',outputs:[{stem:'drums',path:r.output+'/0.wav'}],other:r.output+'/other.wav'}))})`)
  expect((await run()).outputs[0].stem).toBe('drums')
  await writeFile(script,`console.log(JSON.stringify({type:'complete',outputs:[{stem:'drums',path:'/outside.wav'}],other:'/other.wav'}))`)
  await expect(run()).rejects.toThrow('Unexpected separation output')
  await writeFile(script,`process.exit(0)`);await expect(run()).rejects.toThrow()
  await writeFile(script,`setInterval(()=>{},1000)`)
  const controller=new AbortController(),pending=run(controller.signal)
  setTimeout(()=>controller.abort(),50)
  await expect(pending).rejects.toThrow('cancelled')
  const aborted=new AbortController();aborted.abort();await expect(run(aborted.signal)).rejects.toThrow('cancelled')
 }finally{await rm(dir,{recursive:true,force:true})}
})
