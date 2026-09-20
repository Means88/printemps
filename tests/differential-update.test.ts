import {test,expect} from 'vitest'
import {createServer} from 'node:http'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {CancellationToken} from 'builder-util-runtime'
import {NodeHttpExecutor} from 'builder-util/out/nodeHttpExecutor'
import {GenericDifferentialDownloader} from 'electron-updater/out/differentialDownloader/GenericDifferentialDownloader'
import type {BlockMap} from 'builder-util-runtime/out/blockMapApi'
test('installed updater reconstructs and verifies an update using only changed HTTP ranges',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-delta-'))
 const blocks=[Buffer.alloc(16384,1),Buffer.alloc(16384,2),Buffer.alloc(16384,3)],next=[blocks[0],Buffer.alloc(16384,4),blocks[2]]
 const old=Buffer.concat(blocks),updated=Buffer.concat(next);let transferred=0
 const server=createServer((request,response)=>{
  const match=request.headers.range?.match(/^bytes=(\d+)-(\d+)$/)
  if(!match){response.writeHead(400);response.end();return}
  const start=Number(match[1]),end=Number(match[2]),payload=updated.subarray(start,end+1)
  transferred+=payload.length
  response.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${updated.length}`,'Content-Length':payload.length,'Accept-Ranges':'bytes'});response.end(payload)
 })
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const address=server.address();if(!address||typeof address==='string')throw new Error('No server address')
  const previous=path.join(root,'old.zip'),output=path.join(root,'new.zip');await writeFile(previous,old)
  const map=(parts:Buffer[]):BlockMap=>({version:'2',files:[{name:'archive',offset:0,sizes:parts.map(p=>p.length),checksums:parts.map(p=>createHash('sha256').update(p).digest('base64'))}]})
  const downloader=new GenericDifferentialDownloader({size:updated.length,sha512:createHash('sha512').update(updated).digest('base64')},new NodeHttpExecutor(),{oldFile:previous,newFile:output,newUrl:new URL(`http://127.0.0.1:${address.port}/update.zip`),logger:{info:()=>{},warn:()=>{},error:()=>{}},requestHeaders:null,isUseMultipleRangeRequest:false,cancellationToken:new CancellationToken()})
  await downloader.download(map(blocks),map(next))
  expect(await readFile(output)).toEqual(updated);expect(transferred).toBe(16384);expect(transferred).toBeLessThan(updated.length)
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await rm(root,{recursive:true,force:true})}
})
