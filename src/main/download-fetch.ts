import type {ClientRequest,IncomingMessage} from 'electron'
export type DownloadResponse={ok:boolean;status:number;body:AsyncIterable<Uint8Array>}
export type DownloadFetcher=(url:string,init:{signal:AbortSignal})=>Promise<DownloadResponse>
type RequestFactory=(options:{url:string;redirect:'follow';useSessionCookies:false})=>Pick<ClientRequest,'on'|'end'|'abort'>
/** Fetch through an Electron `net.request` so the session's proxy applies and proxy `login` challenges are answered. */
export function createDownloadFetcher(request:RequestFactory,credentials:()=>{username:string;password:string}|null):DownloadFetcher{
 return (url,{signal})=>new Promise((resolve,reject)=>{
  signal.throwIfAborted()
  const client=request({url,redirect:'follow',useSessionCookies:false})
  let settled=false
  const abortError=()=>signal.reason instanceof Error?signal.reason:new DOMException('Download aborted','AbortError')
  const onAbort=()=>{client.abort();if(!settled){settled=true;reject(abortError())}}
  signal.addEventListener('abort',onAbort,{once:true})
  client.on('login',(authInfo,callback)=>{const c=authInfo.isProxy?credentials():null;if(c)callback(c.username,c.password);else callback()})
  client.on('error',error=>{if(!settled){settled=true;signal.removeEventListener('abort',onAbort);reject(error)}})
  client.on('response',(response:IncomingMessage)=>{
   if(settled)return;settled=true
   resolve({ok:response.statusCode>=200&&response.statusCode<300,status:response.statusCode,body:abortable(response as unknown as AsyncIterable<Uint8Array>,signal)})
  })
  client.end()
 })
}
async function* abortable(source:AsyncIterable<Buffer|Uint8Array>,signal:AbortSignal):AsyncGenerator<Uint8Array>{
 const iterator=source[Symbol.asyncIterator]()
 let onAbort:(()=>void)|undefined
 const aborted=new Promise<never>((_,reject)=>{onAbort=()=>reject(signal.reason instanceof Error?signal.reason:new DOMException('Download aborted','AbortError'));signal.addEventListener('abort',onAbort,{once:true})})
 aborted.catch(()=>{})
 try{
  while(true){
   signal.throwIfAborted()
   const result=await Promise.race([iterator.next(),aborted])
   if(result.done)return
   yield result.value
  }
 }finally{if(onAbort)signal.removeEventListener('abort',onAbort);void iterator.return?.().catch(()=>{});(source as {destroy?:()=>void}).destroy?.()}
}
