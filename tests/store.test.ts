import { test, expect } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ProjectStore } from '../src/main/store'
test('persists validated settings and rejects arbitrary asset paths',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-'))
 try {const store=new ProjectStore(root);await store.initialize()
 expect((await store.settings()).language).toBe('zh')
 await store.saveSettings({language:'en',device:'cpu',modelDirectory:'',exportDirectory:''})
 expect((await new ProjectStore(root).settings()).language).toBe('en')
 expect(()=>store.assetPath('../escape',randomUUID())).toThrow()
 expect(()=>store.assetPath(randomUUID(),'../../secrets')).toThrow()
 expect(await store.list()).toEqual([])
 }finally{await rm(root,{recursive:true,force:true})}
})

test('deletion waits for edits, rejects later edits, and startup recovery preserves committed assets',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-recovery-'))
 const {mkdir,writeFile,readFile}=await import('node:fs/promises')
 try{
  const store=new ProjectStore(root);await store.initialize()
  const id=randomUUID(),assetId=randomUUID()
  await store.save({schemaVersion:1,id,name:'Session',sourceName:'source.wav',createdAt:'',updatedAt:'',tracks:[],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:0})
  const assets=path.dirname(store.assetPath(id,assetId)),tasks=path.join(store.projectDirectory(id),'tasks',randomUUID())
  await mkdir(assets,{recursive:true});await mkdir(tasks,{recursive:true})
  await writeFile(store.assetPath(id,assetId),'committed');await writeFile(path.join(tasks,'partial.wav'),'partial')
  await store.recoverInterruptedTasks()
  expect(await readFile(store.assetPath(id,assetId),'utf8')).toBe('committed')
  await expect(readFile(path.join(tasks,'partial.wav'))).rejects.toMatchObject({code:'ENOENT'})
  let release!:()=>void,started!:()=>void
  const gate=new Promise<void>(resolve=>{release=resolve}),entered=new Promise<void>(resolve=>{started=resolve})
  const edit=store.update(id,async project=>{started();await gate;return {...project,name:'Edited'}})
  await entered
  const deletion=store.remove(id,true)
  const lateEdit=store.update(id,project=>({...project,name:'Resurrected'}))
  const rejected=expect(lateEdit).rejects.toMatchObject({code:'ENOENT'})
  release();await edit;await deletion;await rejected
  expect(await store.list()).toEqual([])
 }finally{await rm(root,{recursive:true,force:true})}
})

test('retained projects restore with audio intact and never overwrite an existing project',async()=>{
 const {mkdir,writeFile,readFile,cp}=await import('node:fs/promises')
 const root=await mkdtemp(path.join(tmpdir(),'printemps-archive-'))
 try{
  const store=new ProjectStore(root),id=randomUUID(),assetId=randomUUID()
  await store.initialize()
  const project=await store.save({schemaVersion:1,id,name:'Keep me',sourceName:'source.wav',createdAt:'',updatedAt:'',tracks:[],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:0})
  await mkdir(path.dirname(store.assetPath(id,assetId)),{recursive:true});await writeFile(store.assetPath(id,assetId),'private audio')
  await store.remove(id,false)
  expect(await store.list()).toEqual([])
  const [archived]=await store.listArchived();expect(archived.project).toEqual(project)
  // Simulate a second retained copy: restoration must not replace the first restored project.
  const duplicate=`${id}-${randomUUID()}`
  await cp(path.join(root,'archived',archived.archiveId),path.join(root,'archived',duplicate),{recursive:true})
  expect(await store.restoreArchived(archived.archiveId)).toEqual(project)
  expect(await readFile(store.assetPath(id,assetId),'utf8')).toBe('private audio')
  await expect(store.restoreArchived(duplicate)).rejects.toThrow('already exists')
  await store.purgeArchived(duplicate)
  expect(await store.listArchived()).toEqual([])
  expect(await store.load(id)).toEqual(project)
  expect(await readFile(store.assetPath(id,assetId),'utf8')).toBe('private audio')
  await expect(store.restoreArchived('../escape')).rejects.toThrow('Invalid')
 }finally{await rm(root,{recursive:true,force:true})}
})
