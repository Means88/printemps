import { runJsonWorker } from './json-worker'
import path from 'node:path'
import { z } from 'zod'

export interface SeparationRequest {
 input: string
 output: string
 device: 'auto'|'cpu'|'cuda'|'mps'
 targets: {id:string;config:string;weight:string}[]
}
const progressSchema=z.object({type:z.literal('progress'),stem:z.string(),progress:z.number().min(0).max(1),completed:z.number().int().nonnegative(),total:z.number().int().positive()})
const resultSchema=z.object({type:z.literal('complete'),outputs:z.array(z.object({stem:z.string(),path:z.string()})),other:z.string()})
type WorkerResult=z.infer<typeof resultSchema>
export type InferenceProgress=z.infer<typeof progressSchema>

/** Only main-process callers supply paths; never accept a renderer-provided executable. */
export function runSeparation(python:string,script:string,request:SeparationRequest,signal:AbortSignal,onProgress:(event:InferenceProgress)=>void,interpreterArgs:string[]=['-u']):Promise<WorkerResult> {
 if(!request.targets.length||new Set(request.targets.map(t=>t.id)).size!==request.targets.length)return Promise.reject(new Error('Invalid target selection'))
 return runJsonWorker(python,script,request,signal,event=>{
  if(event.type==='progress'){
   const progress=progressSchema.parse(event)
   if(progress.total!==request.targets.length||!request.targets.some(t=>t.id===progress.stem))throw new Error('Unexpected progress target')
   onProgress(progress);return undefined
  }
  if(event.type!=='complete')throw new Error('Unknown worker response')
  const parsed=resultSchema.parse(event)
  if(parsed.outputs.length!==request.targets.length)throw new Error('Incomplete separation results')
  parsed.outputs.forEach((output,i)=>{
   if(output.stem!==request.targets[i].id||path.resolve(output.path)!==path.resolve(request.output,`${i}.wav`))throw new Error('Unexpected separation output')
  })
  if(path.resolve(parsed.other)!==path.resolve(request.output,'other.wav'))throw new Error('Unexpected residual output')
  return parsed
 },interpreterArgs)
}
