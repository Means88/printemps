import {test,expect} from 'vitest'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {AnalysisService,type AnalysisRunner} from '../src/main/analysis'
import {ProjectStore} from '../src/main/store'
import type {Project} from '../src/shared/domain'
import type {AnalysisTask} from '../src/shared/api'
test('explicit analysis applies recommendations over manual settings, keeps values for failed fields, and stores the recommendation',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-analysis-'))
 try{
  const store=new ProjectStore(root);await store.initialize()
  const project:Project={id:randomUUID(),schemaVersion:1,name:'Test',sourceName:'test.wav',createdAt:'',updatedAt:'',tracks:[{id:randomUUID(),assetId:randomUUID(),name:'Original',role:'original',stem:'original',color:'#aaa',gain:0,solo:false,muted:false,peaks:[],duration:16,sampleRate:44100,channels:2}],music:{bpm:88,key:'D minor',meter:'3/4',firstBeat:.3},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0}
  await store.save(project)
  let mode='success',calls=0
  const runner:AnalysisRunner=async(_python,_script,_input,signal)=>{
   calls++
   await store.update(project.id,current=>({...current,name:'Renamed during analysis'}))
   if(mode==='cancel')await new Promise<void>((_,reject)=>{signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});service.cancel(service.status()!.id)})
   return mode==='success'?{type:'complete',beats:Array.from({length:32},(_,i)=>i*.5),downbeats:Array.from({length:8},(_,i)=>i*2),key:'C major',strength:.8}:{type:'complete',beats:[],downbeats:[],key:'G major',strength:.9,errors:{beats:'fixture failure'}}
  }
  let done:(task:AnalysisTask)=>void=()=>{}
  const service=new AnalysisService(store,'unused','unused',t=>{if(['complete','failed','cancelled'].includes(t.phase))done(t)},runner)
  expect(calls).toBe(0);expect(service.status()).toBeNull()
  async function run(){const completed=new Promise<AnalysisTask>(resolve=>{done=resolve});await service.start(project.id);const result=await completed;await expect.poll(()=>service.busy).toBe(false);return result}
  expect((await run()).phase).toBe('complete')
  let saved=await store.load(project.id)
  expect(saved.music).toEqual({bpm:120,key:'C major',meter:'4/4',firstBeat:0});expect(saved.name).toBe('Renamed during analysis');expect(saved.recommendation).toEqual({bpm:120,key:'C major',meter:'4/4',firstBeat:0})
  await store.update(project.id,current=>({...current,music:{...current.music,bpm:99,key:'D minor'}}))
  mode='partial';await run();saved=await store.load(project.id)
  expect(saved.recommendation).toEqual({bpm:120,key:'G major',meter:'4/4',firstBeat:0});expect(saved.analysis?.errors?.beats).toBe('fixture failure')
  expect(saved.music).toEqual({bpm:99,key:'G major',meter:'4/4',firstBeat:0})
  mode='success';await run();expect((await store.load(project.id)).music).toEqual({bpm:120,key:'C major',meter:'4/4',firstBeat:0});saved=await store.load(project.id)
  mode='cancel';expect((await run()).phase).toBe('cancelled');expect((await store.load(project.id)).recommendation).toEqual(saved.recommendation)
 }finally{await rm(root,{recursive:true,force:true})}
})
