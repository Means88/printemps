import {test,expect} from 'vitest'
import {mkdtemp,mkdir,readdir,rm,symlink,realpath,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {ProjectStore} from '../src/main/store'
import {SettingsService} from '../src/main/settings'
test('directory preferences preserve concurrent language edits and reject private or busy cache targets',async()=>{
 const root=await realpath(await mkdtemp(path.join(tmpdir(),'printemps-settings-')))
 try{
  const store=new ProjectStore(path.join(root,'private'));await store.initialize()
  const selected=path.join(root,'selected');await mkdir(selected)
  let busy=false;const settings=new SettingsService(store,()=>busy)
  await Promise.all([settings.setDirectory('modelDirectory',selected),settings.save({language:'en'})])
  expect(await store.settings()).toMatchObject({modelDirectory:selected,language:'en'})
  expect(await readdir(selected)).toEqual([])
  expect(()=>settings.save({modelDirectory:'/unvalidated'})).toThrow()
  await settings.save({proxyMode:'manual',proxyUrl:' 127.0.0.1:7890 '})
  expect(await store.settings()).toMatchObject({proxyMode:'manual',proxyUrl:'http://127.0.0.1:7890'})
  expect(()=>settings.save({proxyUrl:'ftp://nope'})).toThrow('scheme')
  await settings.save({proxyMode:'system',proxyUrl:''})
  expect(await store.settings()).toMatchObject({proxyMode:'system',proxyUrl:''})
  await expect(settings.setDirectory('exportDirectory',store.root)).rejects.toThrow('private')
  const alias=path.join(root,'alias');await symlink(store.root,alias,process.platform==='win32'?'junction':'dir')
  await expect(settings.setDirectory('modelDirectory',alias)).rejects.toThrow('private')
  const fakePython=path.join(root,'python3');await writeFile(fakePython,'#!/bin/sh\nexit 0\n',{mode:0o755})
  await settings.setPythonPath(fakePython)
  expect((await store.settings()).pythonPath).toBe(await realpath(fakePython))
  await expect(settings.setPythonPath('python3')).rejects.toThrow('absolute')
  await expect(settings.setPythonPath(selected)).rejects.toThrow('not a folder')
  const notExecutable=path.join(root,'plain.txt');await writeFile(notExecutable,'',{mode:0o644})
  await expect(settings.setPythonPath(notExecutable)).rejects.toThrow()
  await settings.setPythonPath('')
  expect((await store.settings()).pythonPath).toBe('')
  busy=true;await expect(settings.setDirectory('modelDirectory','')).rejects.toThrow('Wait')
  expect((await store.settings()).modelDirectory).toBe(selected)
  await settings.setDirectory('exportDirectory',selected)
  busy=false;await settings.setDirectory('modelDirectory','')
  expect((await settings.directories()).modelDirectory).toBe(path.join(store.root,'models'))
  expect((await store.settings()).exportDirectory).toBe(selected)
 }finally{await rm(root,{recursive:true,force:true})}
})
