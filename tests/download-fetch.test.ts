import {test,expect} from 'vitest'
import {EventEmitter} from 'node:events'
import {Readable} from 'node:stream'
import {createDownloadFetcher} from '../src/main/download-fetch'
function fakeRequest(chunks:Buffer[],status=200,challenge=false){
 const calls:{login:[string,string]|[]|null;aborted:boolean;options:unknown}={login:null,aborted:false,options:null}
 const factory=(options:unknown)=>{
  calls.options=options
  const emitter=new EventEmitter() as EventEmitter&{end:()=>void;abort:()=>void}
  emitter.end=()=>{queueMicrotask(()=>{
   if(challenge){emitter.emit('login',{isProxy:true},(...args:[string,string]|[])=>{calls.login=args})}
   const body=Readable.from(chunks) as Readable&{statusCode:number};body.statusCode=status;emitter.emit('response',body)
  })}
  emitter.abort=()=>{calls.aborted=true}
  return emitter as never
 }
 return {factory,calls}
}
test('download fetcher answers proxy login challenges and streams the body',async()=>{
 const {factory,calls}=fakeRequest([Buffer.from('ab'),Buffer.from('c')],200,true)
 const fetcher=createDownloadFetcher(factory,()=>({username:'u',password:'p'}))
 const response=await fetcher('https://example.test/file',{signal:new AbortController().signal})
 expect(response.ok).toBe(true);expect(response.status).toBe(200)
 expect(calls.login).toEqual(['u','p']);expect(calls.options).toMatchObject({url:'https://example.test/file',redirect:'follow',useSessionCookies:false})
 const received:string[]=[];for await(const chunk of response.body)received.push(Buffer.from(chunk).toString())
 expect(received.join('')).toBe('abc')
})
test('download fetcher cancels a challenge without credentials and reports non-2xx statuses',async()=>{
 const {factory,calls}=fakeRequest([],407,true)
 const response=await createDownloadFetcher(factory,()=>null)('https://example.test/file',{signal:new AbortController().signal})
 expect(calls.login).toEqual([]);expect(response.ok).toBe(false);expect(response.status).toBe(407)
})
test('aborting stops the body stream and aborts the request',async()=>{
 const slow=new Readable({read(){}}) as Readable&{statusCode:number};slow.statusCode=200;slow.push(Buffer.from('x'))
 const emitter=new EventEmitter() as EventEmitter&{end:()=>void;abort:()=>void};let aborted=false
 emitter.end=()=>queueMicrotask(()=>emitter.emit('response',slow));emitter.abort=()=>{aborted=true}
 const controller=new AbortController()
 const response=await createDownloadFetcher(()=>emitter as never,()=>null)('https://example.test/file',{signal:controller.signal})
 const iterator=response.body[Symbol.asyncIterator]()
 expect(Buffer.from((await iterator.next()).value).toString()).toBe('x')
 const pending=iterator.next();controller.abort()
 await expect(pending).rejects.toMatchObject({name:'AbortError'})
 expect(aborted).toBe(true)
 const before=new AbortController();before.abort()
 await expect(createDownloadFetcher(()=>emitter as never,()=>null)('https://example.test/file',{signal:before.signal})).rejects.toMatchObject({name:'AbortError'})
})
