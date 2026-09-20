import {expect,test,vi} from 'vitest'
import {randomUUID} from 'node:crypto'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {ProjectStore} from '../src/main/store'
import {ProjectSession,type SaveState} from '../src/renderer/project-session'
import {applyProjectEdits,diffProjectEdits,projectEditsSchema,type ProjectEdits} from '../src/shared/project-edits'
import {commitSeparation,type Project,type Track} from '../src/shared/domain'

const track=(name:string,role:Track['role']='stem'):Track=>({id:randomUUID(),assetId:randomUUID(),name,stem:name,role,color:'#aaa',gain:0,muted:false,solo:false,duration:10,sampleRate:44100,channels:2,peaks:[]})
const make=():Project=>({schemaVersion:1,id:randomUUID(),name:'Song',sourceName:'song.wav',createdAt:'',updatedAt:'',tracks:[track('Original','original'),track('A')],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0})
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r});return {promise,resolve}}

test('two edits from one render preserve both fields through delayed save acknowledgments',async()=>{
 const base=make(),gate=deferred<void>();let stored=base,visible:Project|null=null
 const writes:ProjectEdits[]=[],errors:Error[]=[]
 const session=new ProjectSession({read:async()=>stored,save:async(_id,edits)=>{writes.push(edits);if(writes.length===1)await gate.promise;return stored=applyProjectEdits(stored,edits)}},p=>{visible=p},()=>{},e=>errors.push(e))
 session.open(base)
 session.edit(base,{...base,music:{...base.music,bpm:132}})
 await vi.waitFor(()=>expect(writes).toHaveLength(1))
 session.edit(base,{...base,music:{...base.music,key:'D minor'}})
 expect(visible!.music).toEqual({...base.music,bpm:132,key:'D minor'})
 gate.resolve();await session.flush()
 expect(stored.music).toEqual(visible!.music)
 expect(writes).toEqual([{music:{bpm:132}},{music:{key:'D minor'}}]);expect(errors).toEqual([])
})

test('a background refresh preserves optimistic edits, new results and recommendations',async()=>{
 const base=make(),read=deferred<Project>();let stored=base,visible:Project|null=null
 const reader=vi.fn(()=>read.promise)
 const session=new ProjectSession({read:reader,save:async(_id,edits)=>stored=applyProjectEdits(stored,edits)},p=>{visible=p},()=>{},error=>{throw error})
 session.open(base);session.refresh(base.id)
 await vi.waitFor(()=>expect(reader).toHaveBeenCalled())
 stored={...commitSeparation(base,base.tracks[1].id,[track('Other','other'),track('B')]),monitor:'stems',recommendation:{bpm:132}}
 const snapshot=structuredClone(stored)
 session.edit(base,{...base,name:'Latest name',music:{...base.music,meter:'3/4'}})
 read.resolve(snapshot);await session.flush()
 expect(visible!.name).toBe('Latest name');expect(visible!.music.meter).toBe('3/4')
 expect(visible!.tracks.map(t=>t.name)).toEqual(['Original','A - Other','B','A'])
 expect(visible!.monitor).toBe('stems');expect(visible!.recommendation).toEqual({bpm:132})
 expect(stored).toEqual(visible)
})

test('failed edits stay pending, block leaving, and are retried before later edits',async()=>{
 const base=make();let stored=base,fail=true,visible:Project|null=null,status:SaveState={pending:0,error:null}
 const reported:Error[]=[],writes:ProjectEdits[]=[]
 const session=new ProjectSession({read:async()=>stored,save:async(_id,edits)=>{writes.push(edits);if(fail)throw new Error('Disk unavailable');return stored=applyProjectEdits(stored,edits)}},p=>{visible=p},value=>{status=value},e=>reported.push(e))
 session.open(base);session.edit(base,{...base,name:'Keep this name'})
 await expect(session.flush()).rejects.toThrow('Disk unavailable')
 expect(status).toEqual({pending:1,error:'Disk unavailable'})
 expect(()=>session.open(null)).toThrow('Save pending')
 fail=false
 const latest=visible!
 session.edit(latest,{...latest,masterGain:-9});await session.flush()
 expect(writes).toEqual([{name:'Keep this name'},{name:'Keep this name'},{masterGain:-9}])
 expect(stored.name).toBe('Keep this name');expect(stored.masterGain).toBe(-9)
 expect(status).toEqual({pending:0,error:null});expect(reported).toHaveLength(1)
 session.open(null);expect(visible).toBeNull()
})

test('explicit save retry persists the original edit without requiring another change',async()=>{
 const base=make();let stored=base,fail=true
 const session=new ProjectSession({read:async()=>stored,save:async(_id,edits)=>{if(fail)throw new Error('Write failed');return stored=applyProjectEdits(stored,edits)}},()=>{},()=>{},()=>{})
 session.open(base);session.edit(base,{...base,masterGain:-12})
 await expect(session.flush()).rejects.toThrow('Write failed')
 fail=false;session.retry();await session.flush();expect(stored.masterGain).toBe(-12)
})

test('metadata patches cannot change assets or overwrite analysis and ignore retired track edits',()=>{
 const base=make(),next=commitSeparation(base,base.tracks[1].id,[track('Other','other'),track('B')])
 next.recommendation={bpm:130}
 const edits=diffProjectEdits(base,{...base,tracks:base.tracks.map(t=>({...t,name:`Edited ${t.name}`}))})
 const merged=applyProjectEdits(next,edits)
 expect(merged.tracks.map(t=>t.name)).toEqual(['Edited Original','A - Other','B','Edited A'])
 expect(merged.recommendation).toEqual({bpm:130})
 expect(()=>projectEditsSchema.parse({recommendation:{bpm:90}})).toThrow()
 expect(()=>projectEditsSchema.parse({tracks:[{...edits.tracks![0],role:'stem'}]})).toThrow()
 expect(()=>applyProjectEdits(base,{tracks:[{id:base.tracks[0].id,assetId:randomUUID(),name:'Wrong asset'}]})).toThrow('immutable')
})

test('queued field edits and a concurrent task commit survive reopening the on-disk project',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-session-'))
 try{
  const store=new ProjectStore(root);await store.initialize()
  const base=make();await store.save(base)
  const session=new ProjectSession({read:id=>store.load(id),save:(id,edits)=>store.update(id,current=>applyProjectEdits(current,edits))},()=>{},()=>{},()=>{})
  session.open(base)
  session.edit(base,{...base,name:'Saved name',music:{...base.music,bpm:128}})
  await store.update(base.id,current=>({...commitSeparation(current,base.tracks[1].id,[track('Other','other'),track('B')]),recommendation:{bpm:134},monitor:'stems'}))
  session.refresh(base.id)
  session.edit(base,{...base,tracks:base.tracks.map(t=>t.role==='original'?{...t,name:'Reference',gain:-6}:t),music:{...base.music,meter:'3/4'}})
  await session.flush();session.open(null)
  const reopened=await new ProjectStore(root).load(base.id)
  expect(reopened.name).toBe('Saved name');expect(reopened.music.bpm).toBe(128);expect(reopened.music.meter).toBe('3/4')
  expect(reopened.tracks.map(t=>t.name)).toEqual(['Reference','A - Other','B','A'])
  expect(reopened.tracks[0].gain).toBe(-6);expect(reopened.recommendation).toEqual({bpm:134});expect(reopened.monitor).toBe('stems')
 }finally{await rm(root,{recursive:true,force:true})}
})
