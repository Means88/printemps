import path from 'node:path'
import {analyzeKey} from './key-worker'
import {TaskScheduler} from './task-scheduler'
import {randomUUID} from 'node:crypto'
import {runJsonWorker} from './json-worker'
import {ProjectStore} from './store'
import {analysisResultSchema,summarizeAnalysis,type AnalysisResult} from '../shared/analysis'
import type {AnalysisTask} from '../shared/api'
export type AnalysisRunner=(python:string,script:string,input:string,signal:AbortSignal,progress:(stage:'beats'|'key')=>void)=>Promise<AnalysisResult>
export const runAnalysis:AnalysisRunner=async(python,script,input,signal,progress)=>{
 let result:AnalysisResult={type:'complete',beats:[],downbeats:[],key:null,strength:null,errors:{}}
 try{
  result=await runJsonWorker(python,script,{input},signal,event=>{
   if(event.type==='progress'&&event.stage==='beats'){progress('beats');return undefined}
   return analysisResultSchema.parse(event)
  })
 }catch(error){signal.throwIfAborted();result.errors={beats:error instanceof Error?error.message:String(error)}}
 signal.throwIfAborted();progress('key')
 try{Object.assign(result,await analyzeKey(path.join(path.dirname(script),'key.cjs'),input,signal))}
 catch(error){signal.throwIfAborted();result.errors={...result.errors,key:error instanceof Error?error.message:String(error)}}
 return result
}
export class AnalysisService {
 private task:AnalysisTask|null=null
 private controller:AbortController|null=null
 constructor(private store:ProjectStore,private python:string,private script:string,private notify:(task:AnalysisTask)=>void,private runner:AnalysisRunner=runAnalysis,private scheduler=new TaskScheduler()){}
 get busy(){return this.controller!==null}
 status(){return this.task?{...this.task}:null}
 cancel(id:string){if(this.task?.id===id)this.controller?.abort()}
 async start(projectId:string){
  if(this.busy)throw new Error('Analysis already running')
  const controller=new AbortController();this.controller=controller
  try{
   const project=await this.store.load(projectId),source=project.tracks.find(t=>t.role==='original')
   if(!source)throw new Error('Original audio unavailable')
   this.task={id:randomUUID(),projectId,phase:'waiting',stage:'beats'}
   const initial={...this.task}
   void this.execute(projectId,source.assetId,source.duration,controller)
   return initial
  }catch(e){this.controller=null;throw e}
 }
 private emit(update:Partial<AnalysisTask>){this.task={...this.task!,...update};this.notify({...this.task})}
 private async execute(projectId:string,assetId:string,duration:number,controller:AbortController){
  let release:(()=>void)|undefined
  try{
   release=await this.scheduler.acquire(controller.signal);this.emit({phase:'analyzing'})
   const result=await this.runner(this.python,this.script,this.store.assetPath(projectId,assetId),controller.signal,stage=>this.emit({stage}))
   const {recommendation,warnings}=summarizeAnalysis(result,duration)
   await this.store.update(projectId,project=>{
    controller.signal.throwIfAborted()
    if(project.tracks.find(t=>t.role==='original')?.assetId!==assetId)throw new Error('Original audio changed')
    // Analysis applies its recommendation right away, replacing manual values (user decision 2026-09-20); fields whose analysis failed keep the current value and Reset restores the recommendation later.
    const merged={...recommendation}
    if(result.errors?.beats)for(const field of ['bpm','meter','firstBeat'] as const){const value=project.recommendation?.[field];if(value!=null)Object.assign(merged,{[field]:value})}
    if(result.errors?.key&&project.recommendation?.key)merged.key=project.recommendation.key
    const music={...project.music}
    if(!result.errors?.beats)for(const field of ['bpm','meter','firstBeat'] as const){const value=merged[field];if(value!=null)Object.assign(music,{[field]:value})}
    if(!result.errors?.key&&merged.key!=null)music.key=merged.key
    return {...project,music,recommendation:merged,analysis:{analyzedAt:new Date().toISOString(),warnings,beatCount:result.beats.length,downbeatCount:result.downbeats.length,keyStrength:result.errors?.key?project.analysis?.keyStrength??null:result.strength,errors:result.errors},updatedAt:new Date().toISOString()}
   })
   this.emit({phase:'complete'})
  }catch(e){this.emit({phase:controller.signal.aborted?'cancelled':'failed',error:e instanceof Error?e.message:String(e)})}
  finally{this.controller=null;release?.()}
 }
}
