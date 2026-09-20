import { test,expect,vi } from 'vitest'
import { mkdtemp,mkdir,writeFile,readFile,readdir,rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID,createHash } from 'node:crypto'
import { ProjectStore } from '../src/main/store'
import { ModelCache } from '../src/main/models'
import { SeparationService } from '../src/main/separation'
import type { runSeparation } from '../src/main/inference-worker'
import type { Project } from '../src/shared/domain'
import type { SeparationTask } from '../src/shared/api'

test('separation commits residual first, preserves concurrent edits, and failed/cancelled tasks retain source',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-separation-'))
 try{
  const store=new ProjectStore(root);await store.initialize()
  const id=randomUUID(),sourceId=randomUUID(),assetId=randomUUID()
  const audio=Buffer.alloc(44+8*441);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(3,20);audio.writeUInt16LE(2,22);audio.writeUInt32LE(44100,24);audio.writeUInt32LE(352800,28);audio.writeUInt16LE(8,32);audio.writeUInt16LE(32,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40)
  await mkdir(path.dirname(store.assetPath(id,assetId)),{recursive:true});await writeFile(store.assetPath(id,assetId),audio)
  const source={id:sourceId,assetId,name:'A',role:'stem' as const,stem:'guitar',color:'#aaa',gain:0,muted:false,solo:false,peaks:[],duration:.01,sampleRate:44100,channels:2}
  const project:Project={schemaVersion:1,id,name:'Before',sourceName:'source.wav',createdAt:'',updatedAt:'',tracks:[{...source,id:randomUUID(),role:'original',name:'Original'},source],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:0}
  await store.save(project)
  const bytes=Buffer.from('fixture'),file={path:'model',bytes:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex'),checksumAlgorithm:'sha256'}
  const cache=new ModelCache(path.join(root,'models'),[{id:'drums',weight:file,config:file,totalBytes:bytes.length*2}]);await mkdir(cache.directory);await writeFile(cache.location(file),bytes)
  let mode:'success'|'failure'|'cancel'='success'
  const runner:typeof runSeparation=async(_python,_script,request,signal)=>{
   await store.update(id,current=>({...current,name:'During inference'}))
   if(mode==='failure')throw new Error('inference failed')
   if(mode==='cancel')await new Promise<void>((_,reject)=>{signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});service.cancel(service.status()!.id)})
   await writeFile(path.join(request.output,'0.wav'),audio);await writeFile(path.join(request.output,'other.wav'),audio)
   return {type:'complete',outputs:[{stem:'drums',path:path.join(request.output,'0.wav')}],other:path.join(request.output,'other.wav')}
  }
  const snapshots:SeparationTask[]=[]
  let resolveTask:(task:SeparationTask)=>void=()=>{}
  const service=new SeparationService(store,'unused','unused',task=>{snapshots.push(task);if(['complete','failed','cancelled'].includes(task.phase))resolveTask(task)},runner)
  async function run(source:string){const completed=new Promise<SeparationTask>(resolve=>{resolveTask=resolve});await service.start(id,source,['drums'],cache,'cpu');const task=await completed;await expect.poll(()=>service.busy).toBe(false);return task}
  const completed=await run(sourceId);expect(completed.phase).toBe('complete');expect(completed.targets).toEqual(['drums'])
  expect(completed.downloadModels).toEqual([{id:'drums',received:bytes.length*2,total:bytes.length*2,ready:true}])
  expect(snapshots.some(task=>task.downloadModels?.some(row=>row.received===bytes.length&&!row.ready))).toBe(true)
  const result=await store.load(id)
  expect(result.lastSeparation).toMatchObject({state:'complete',completed:1,targets:['drums']})
  expect(result.name).toBe('During inference');expect(result.tracks.map(t=>t.role)).toEqual(['original','other','stem','stem']);expect(result.tracks.find(t=>t.id===sourceId)?.hidden).toBe(true)
  expect(await readFile(store.assetPath(id,assetId))).toEqual(audio)
  const assets=await readdir(path.dirname(store.assetPath(id,assetId)))
  mode='failure';expect((await run(result.tracks[1].id)).phase).toBe('failed')
  expect((await store.load(id)).tracks).toEqual(result.tracks)
  mode='cancel';expect((await run(result.tracks[1].id)).phase).toBe('cancelled')
  expect((await store.load(id)).lastSeparation).toMatchObject({state:'cancelled',completed:0})
  expect((await store.load(id)).tracks).toEqual(result.tracks)
  expect(await readdir(path.dirname(store.assetPath(id,assetId)))).toEqual(assets)
  expect(await readdir(path.join(store.projectDirectory(id),'tasks'))).toEqual([])
  const ensure=vi.spyOn(cache,'ensure').mockRejectedValueOnce(new Error('Download interrupted'))
  const downloadFailure=await run(result.tracks[1].id)
  expect(downloadFailure).toMatchObject({phase:'failed',failurePhase:'downloading',error:'Download interrupted'})
  expect((await store.load(id)).tracks).toEqual(result.tracks)
  ensure.mockRestore()
  mode='failure'
  expect(await run(result.tracks[1].id)).toMatchObject({phase:'failed',failurePhase:'separating',error:'inference failed'})
 }finally{await rm(root,{recursive:true,force:true})}
})
