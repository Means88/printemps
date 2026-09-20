import {test,expect} from 'vitest'
import {createHash} from 'node:crypto'
import {mkdtemp,rm,readdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {ModelCache,type ModelEntry,type DownloadProgress} from '../src/main/models'
const data=Buffer.from('model test bytes')
const file={path:'v1/test.ckpt',bytes:data.length,checksum:createHash('sha256').update(data).digest('hex'),checksumAlgorithm:'sha256'}
const model:ModelEntry={id:'test',weight:file,config:{...file,path:'v1/test.yaml'},totalBytes:data.length*2}
test('only selected models download, verified cache is reused and corruption is repaired',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-cache-'));let calls=0
 const cache=new ModelCache(dir,[model],'https://example.test/',(async()=>{calls++;return new Response(data)}) as typeof fetch)
 try{
  await expect(cache.ensure('unknown',new AbortController().signal,()=>{})).rejects.toThrow('Unknown')
  await cache.ensure('test',new AbortController().signal,()=>{});expect(calls).toBe(2);expect((await cache.list())[0].cached).toBe(true)
  const cachedProgress:DownloadProgress[]=[]
  await cache.ensure('test',new AbortController().signal,p=>cachedProgress.push(p));expect(calls).toBe(2)
  expect(cachedProgress.map(p=>p.phase)).toEqual(['cached','cached'])
  const repairProgress:DownloadProgress[]=[]
  await writeFile(cache.location(file),'corrupt');await cache.ensure('test',new AbortController().signal,p=>repairProgress.push(p));expect(calls).toBe(3)
  expect(repairProgress[0]).toMatchObject({phase:'downloading',received:0})
  expect(repairProgress.at(-1)).toMatchObject({phase:'cached',received:model.totalBytes})
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

test('mid-stream cancellation preserves completed files and retry downloads only the missing file',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-cancel-'))
 const requests:string[]=[]
 const server=createServer((req,res)=>{
  requests.push(req.url!)
  res.writeHead(200,{'Content-Length':data.length})
  if(req.url!.endsWith('.yaml')){
   res.write(data.subarray(0,4))
   const timer=setTimeout(()=>res.end(data.subarray(4)),100)
   res.on('close',()=>clearTimeout(timer))
  }else res.end(data)
 })
 server.listen(0,'127.0.0.1');await once(server,'listening')
 const address=server.address() as {port:number}
 const cache=new ModelCache(dir,[model],`http://127.0.0.1:${address.port}/`)
 try{
  const controller=new AbortController()
  await expect(cache.ensure('test',controller.signal,p=>{if(p.received>file.bytes&&p.received<model.totalBytes)controller.abort()})).rejects.toThrow()
  expect(await readdir(dir)).toEqual(['test.ckpt'])
  expect((await cache.list())[0].cached).toBe(false)
  await cache.ensure('test',new AbortController().signal,()=>{})
  expect((await cache.list())[0].cached).toBe(true)
  expect(requests).toEqual(['/v1/test.ckpt','/v1/test.yaml','/v1/test.yaml'])
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true})}
})

test('a truncated HTTP response cannot become a cached model and can be retried',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'printemps-interrupted-'))
 let interrupted=true
 const server=createServer((_req,res)=>{
  res.writeHead(200,{'Content-Length':data.length})
  if(interrupted){res.write(data.subarray(0,4));setTimeout(()=>res.destroy(),20)}
  else res.end(data)
 })
 server.listen(0,'127.0.0.1');await once(server,'listening')
 const cache=new ModelCache(dir,[model],`http://127.0.0.1:${(server.address() as {port:number}).port}/`)
 try{
  await expect(cache.ensure('test',new AbortController().signal,()=>{})).rejects.toThrow()
  expect(await readdir(dir)).toEqual([])
  expect((await cache.list())[0].cached).toBe(false)
  interrupted=false
  await cache.ensure('test',new AbortController().signal,()=>{})
  expect((await cache.list())[0].cached).toBe(true)
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true})}
})
