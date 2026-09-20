import {test,expect} from 'vitest'
import {mkdtemp,mkdir,realpath,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {ExportFolders} from '../src/main/export-folders'

test('opening export folders is limited to successful output locations in the current session',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-export-folders-'))
 try{
  const exported=path.join(root,'exports'),internal=path.join(root,'private')
  await mkdir(exported);await mkdir(internal)
  const registry=new ExportFolders()
  await expect(registry.resolve(exported)).rejects.toThrow('Unknown export folder')
  registry.remember([path.join(await realpath(exported),'track.wav')])
  expect(await registry.resolve(exported)).toBe(await realpath(exported))
  await expect(registry.resolve(internal)).rejects.toThrow('Unknown export folder')
  await expect(registry.resolve('exports')).rejects.toThrow('Unknown export folder')
  await expect(new ExportFolders().resolve(exported)).rejects.toThrow('Unknown export folder')
  await rm(exported,{recursive:true})
  await expect(registry.resolve(exported)).rejects.toThrow()
 }finally{await rm(root,{recursive:true,force:true})}
})
