import {Worker} from 'node:worker_threads'
import {z} from 'zod'
const resultSchema=z.object({key:z.string().nullable(),strength:z.number().finite().min(-1).max(1).nullable()})
export function analyzeKey(script:string,input:string,signal:AbortSignal):Promise<z.infer<typeof resultSchema>>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new Error('Task cancelled'));return}
  const worker=new Worker(script,{workerData:{input}})
  let finished=false
  const finish=(error?:Error,value?:z.infer<typeof resultSchema>)=>{
   if(finished)return;finished=true;signal.removeEventListener('abort',cancel)
   void worker.terminate()
   if(error)reject(error);else resolve(value!)
  }
  const cancel=()=>finish(new Error('Task cancelled'))
  signal.addEventListener('abort',cancel,{once:true})
  worker.on('message',message=>{try{if(message?.error)throw new Error(message.error);finish(undefined,resultSchema.parse(message))}catch(error){finish(error instanceof Error?error:new Error(String(error)))}})
  worker.on('error',error=>finish(error instanceof Error?error:new Error(String(error))))
  worker.on('exit',code=>{if(!finished)finish(new Error(`Key analysis ended without result (${code})`))})
 })
}
