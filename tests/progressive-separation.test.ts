import {test,expect} from 'vitest'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {randomUUID,createHash} from 'node:crypto'
import {ProjectStore} from '../src/main/store'
import {ModelCache} from '../src/main/models'
import {SeparationService} from '../src/main/separation'
import type {runSeparation} from '../src/main/inference-worker'
import type {SeparationTask} from '../src/shared/api'
import {recoverSeparationTask} from '../src/shared/task-recovery'

test('original separation publishes complete stem/residual pairs before later targets finish and preserves edits',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-progressive-'))
 try{
  const store=new ProjectStore(root);await store.initialize()
  const id=randomUUID(),assetId=randomUUID(),sourceId=randomUUID()
  const audio=Buffer.alloc(44+8*441);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(3,20);audio.writeUInt16LE(2,22);audio.writeUInt32LE(44100,24);audio.writeUInt32LE(352800,28);audio.writeUInt16LE(8,32);audio.writeUInt16LE(32,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40)
  await mkdir(path.dirname(store.assetPath(id,assetId)),{recursive:true});await writeFile(store.assetPath(id,assetId),audio)
  await store.save({schemaVersion:1,id,name:'Session',sourceName:'source.wav',createdAt:'',updatedAt:'',tracks:[{id:sourceId,assetId,name:'Original',role:'original',stem:'original',color:'#aaa',gain:0,muted:false,solo:false,peaks:[],duration:.01,sampleRate:44100,channels:2}],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0})
  const bytes=Buffer.from('fixture'),file={path:'model',bytes:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex'),checksumAlgorithm:'sha256'}
  const cache=new ModelCache(path.join(root,'models'),['drums','bass'].map(id=>({id,weight:file,config:file,totalBytes:bytes.length*2})))
  await mkdir(cache.directory);await writeFile(cache.location(file),bytes)
  let failSecond=false
  const runner:typeof runSeparation=async(_python,_script,request)=>{
   const stem=request.targets[0].id
   if(stem==='bass'){
    const partial=await store.load(id)
    expect(partial.lastSeparation).toMatchObject({state:'running',completed:1,targets:['drums','bass']})
    expect(partial.tracks.map(t=>t.role)).toEqual(['original','other','stem'])
    expect(request.input).toBe(store.assetPath(id,partial.tracks[1].assetId))
    await store.update(id,p=>({...p,tracks:p.tracks.map(t=>t.stem==='drums'?{...t,name:'Edited drums',gain:-8}:t)}))
    if(failSecond)throw new Error('Second target failed')
   }
   await writeFile(path.join(request.output,'0.wav'),audio);await writeFile(path.join(request.output,'other.wav'),audio)
   return {type:'complete',outputs:[{stem,path:path.join(request.output,'0.wav')}],other:path.join(request.output,'other.wav')}
  }
  let finished!:(task:SeparationTask)=>void
  const service=new SeparationService(store,'unused','unused',task=>{if(['complete','failed'].includes(task.phase))finished(task)},runner)
  async function run(){const result=new Promise<SeparationTask>(resolve=>{finished=resolve});await service.start(id,sourceId,['drums','bass'],cache,'cpu');const task=await result;await expect.poll(()=>service.busy).toBe(false);return task}
  expect((await run()).phase).toBe('complete')
  const result=await store.load(id)
  expect(result.lastSeparation).toMatchObject({state:'complete',completed:2})
  expect(result.lastSeparation?.finishedAt).toBeTruthy()
  expect(result.tracks.map(t=>t.stem)).toEqual(['original','other','drums','bass'])
  expect(result.tracks[2].name).toBe('Edited drums');expect(result.tracks[2].gain).toBe(-8)
  await store.save({...result,tracks:[result.tracks[0]]});failSecond=true
  const failed=await run(),partial=await store.load(id)
  expect(failed.phase).toBe('failed');expect(partial.tracks.map(t=>t.stem)).toEqual(['original','other','drums'])
  expect(partial.lastSeparation).toMatchObject({state:'failed',completed:1,error:'Second target failed'})
  expect(recoverSeparationTask(partial)).toMatchObject({sourceId:partial.tracks[1].id,remainingTargets:['bass']})
  expect(recoverSeparationTask(result)).toBeNull()
  expect(failed.remainingTargets).toEqual(['bass']);expect(failed.retrySourceId).toBe(partial.tracks[1].id)
  await store.update(id,p=>({...p,lastSeparation:{...p.lastSeparation!,state:'running',finishedAt:undefined}}))
  await store.recoverInterruptedTasks()
  const recovered=await store.load(id)
  expect(recovered.lastSeparation).toMatchObject({state:'interrupted',completed:1})
  expect(recovered.tracks).toEqual(partial.tracks)
  expect(recoverSeparationTask(recovered)).toMatchObject({phase:'failed',remainingTargets:['bass'],retrySourceId:partial.tracks[1].id})
  expect(recoverSeparationTask({...recovered,tracks:[recovered.tracks[0]]})).toBeNull()
 }finally{await rm(root,{recursive:true,force:true})}
})
