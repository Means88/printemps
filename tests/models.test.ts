import {test,expect} from 'vitest'
import {createHash} from 'node:crypto'
import {mkdtemp,rm,readdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {ModelCache,type ModelEntry} from '../src/main/models'
const data=Buffer.from('model test bytes')
const file={path:'v1/test.ckpt',bytes:data.length,checksum:createHash('sha256').update(data).digest('hex'),checksumAlgorithm:'sha256'}
const model:ModelEntry={id:'test',weight:file,config:{...file,path:'v1/test.yaml'},totalBytes:data.length*2}
test('only selected models download, verified cache is reused and corruption is repaired',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-cache-'));let calls=0
 const cache=new ModelCache(dir,[model],'https://example.test/',(async()=>{calls++;return new Response(data)}) as typeof fetch)
 try{
  await expect(cache.ensure('unknown',new AbortController().signal,()=>{})).rejects.toThrow('Unknown')
  await cache.ensure('test',new AbortController().signal,()=>{});expect(calls).toBe(2);expect((await cache.list())[0].cached).toBe(true)
  await cache.ensure('test',new AbortController().signal,()=>{});expect(calls).toBe(2)
  await writeFile(cache.location(file),'corrupt');await cache.ensure('test',new AbortController().signal,()=>{});expect(calls).toBe(3)
 }finally{await rm(dir,{recursive:true,force:true})}
})
test('bad checksum never becomes cached and cancelled downloads leave no partial files',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-cache-'))
 try{
  const cache=new ModelCache(dir,[model],'https://example.test/',(async()=>new Response(Buffer.alloc(data.length))) as typeof fetch)
  await expect(cache.ensure('test',new AbortController().signal,()=>{})).rejects.toThrow('integrity')
  expect(await readdir(dir)).toEqual([])
  const abort=new AbortController();abort.abort()
  await expect(cache.ensure('test',abort.signal,()=>{})).rejects.toThrow();expect(await readdir(dir)).toEqual([])
 }finally{await rm(dir,{recursive:true,force:true})}
})
