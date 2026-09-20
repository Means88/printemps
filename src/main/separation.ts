import {selectedClip,clipDuration,type Clip} from '../shared/clips'
import {renderClip} from './clip-audio'
import {TaskScheduler} from './task-scheduler'
import { stemColor, stemLabel } from '../shared/stems'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { ProjectStore } from './store'
import { ModelCache } from './models'
import { inspectWave } from './audio'
import { runSeparation } from './inference-worker'
import { commitSeparation, type Settings, type Track } from '../shared/domain'
import type { SeparationTask } from '../shared/api'
export class SeparationService {
 private task:SeparationTask|null=null
 private controller:AbortController|null=null
 constructor(private store:ProjectStore,private python:string,private script:string,private notify:(task:SeparationTask)=>void,private runner=runSeparation,private scheduler=new TaskScheduler()){}
 get busy(){return this.controller!==null}
 status(){return this.task?{...this.task}:null}
 cancel(id:string){if(this.task?.id===id)this.controller?.abort()}
 async start(projectId:string,sourceId:string,ids:string[],cache:ModelCache,device:Settings['device'],clipId?:string){
  if(this.busy)throw new Error('Another separation is running')
  z.string().uuid().parse(projectId);z.string().uuid().parse(sourceId)
  z.array(z.string()).min(1).max(53).parse(ids)
  if(new Set(ids).size!==ids.length)throw new Error('Duplicate targets')
  ids.forEach(id=>cache.entry(id))
  // Reserve before asynchronous I/O to prevent two simultaneous starts.
  const controller=new AbortController();this.controller=controller
  try{
   const project=await this.store.load(projectId),source=project.tracks.find(t=>t.id===sourceId)
   if(!source||source.hidden)throw new Error('Source track no longer exists')
   const clip=selectedClip(source,clipId)
   this.task={id:randomUUID(),projectId,sourceId,clipId:clip.id,phase:'waiting',progress:0,targets:[...ids]}
   await this.store.update(projectId,current=>({...current,lastSeparation:{id:this.task!.id,sourceId,clipId:clip.id,targets:[...ids],state:'running',completed:0,startedAt:new Date().toISOString()},updatedAt:new Date().toISOString()}))
   const initial={...this.task}
   void this.execute(cache,ids,source,device,controller,clip)
   return initial
  }catch(e){this.controller=null;throw e}
 }
 private emit(update:Partial<SeparationTask>){this.task={...this.task!,...update};this.notify({...this.task})}
 private async finish(state:'complete'|'failed'|'cancelled',error?:string){
  const task=this.task!
  await this.store.update(task.projectId,current=>current.lastSeparation?.id!==task.id?current:{...current,lastSeparation:{...current.lastSeparation,state,finishedAt:new Date().toISOString(),error},updatedAt:new Date().toISOString()})
 }
 private async execute(cache:ModelCache,ids:string[],source:Track,device:Settings['device'],controller:AbortController,clip:Clip){
  const {projectId,id}=this.task!,signal=controller.signal
  const directory=path.join(this.store.projectDirectory(projectId),'tasks',id),created:string[]=[]
  let failurePhase:'downloading'|'separating'='separating'
  let committed=false,release:(()=>void)|undefined
  try{
   release=await this.scheduler.acquire(signal)
   await fs.mkdir(directory,{recursive:true})
   const disk=await fs.statfs(directory)
   if(disk.bavail*disk.bsize<clipDuration(clip)*44100*8*(ids.length+1)*2+16*1024*1024)throw new Error('Insufficient disk space for separation results')
   const targets=[]
   const total=ids.reduce((sum,id)=>sum+cache.entry(id).totalBytes,0);let received=0
   for(const stem of ids){
    failurePhase='downloading'
    const files=await cache.ensure(stem,signal,p=>this.emit({phase:'downloading',stem,progress:(received+p.received)/total}))
    targets.push({id:stem,...files});received+=cache.entry(stem).totalBytes
   }
   failurePhase='separating'
   signal.throwIfAborted();this.emit({phase:'separating',progress:0,stem:ids[0]})
   const input=path.join(directory,'input.wav')
   const sourceFile=this.store.assetPath(projectId,source.assetId)
   const cropped=clip.start!==0||clip.end!==source.duration
   if(cropped)await renderClip(sourceFile,input,clip,source.sampleRate,signal)
   const inputFile=cropped?input:sourceFile
   if(source.role==='original'){await this.executeOriginal(projectId,source,targets,directory,device,signal,clip,inputFile);committed=true;await this.finish('complete');this.emit({phase:'complete',progress:1});return}
   const result=await this.runner(this.python,this.script,{input:inputFile,output:directory,device,targets},signal,p=>this.emit({phase:'separating',progress:p.progress,stem:p.stem}))
   const outputs:Track[]=[]
   const en=(await this.store.settings()).language==='en'
   const files=[{stem:'other',path:result.other},...result.outputs]
   for(const [i,file] of files.entries()){
    signal.throwIfAborted()
    const meta=await inspectWave(file.path)
    if(meta.sampleRate!==source.sampleRate||meta.channels!==source.channels||Math.abs(meta.duration-clipDuration(clip))>1/source.sampleRate)throw new Error('Separation result is not aligned with source')
    const assetId=randomUUID(),destination=this.store.assetPath(projectId,assetId)
    await fs.rename(file.path,destination);created.push(destination)
    outputs.push({id:randomUUID(),assetId,name:stemLabel(file.stem,en),role:i===0?'other':'stem',stem:file.stem,color:stemColor(file.stem),gain:0,muted:false,solo:false,...meta})
   }
   await this.store.update(projectId,current=>{
    signal.throwIfAborted()
    if(current.tracks.find(t=>t.id===source.id)?.assetId!==source.assetId)throw new Error('Source track changed')
    return {...commitSeparation(current,source.id,outputs,clip),monitor:'stems',lastSeparation:{...current.lastSeparation!,completed:ids.length}}
   })
   committed=true
   await this.finish('complete')
   this.emit({phase:'complete',progress:1})
  }catch(e){
   const phase=signal.aborted?'cancelled':'failed';let error=e instanceof Error?e.message:String(e)
   try{await this.finish(phase,error)}catch(saveError){error+=`; Could not save task status: ${String(saveError)}`}
   this.emit({phase,error,failurePhase})
  }
  finally{
   if(!committed)await Promise.all(created.map(file=>fs.rm(file,{force:true}).catch(()=>{})))
   await fs.rm(directory,{recursive:true,force:true}).catch(()=>{})
   this.controller=null;release?.()
  }
 }
 private async executeOriginal(projectId:string,source:Track,targets:{id:string;config:string;weight:string}[],directory:string,device:Settings['device'],signal:AbortSignal,clip:Clip,inputFile:string){
  let remainder:Track|undefined
  let lastStemId:string|undefined
  const en=(await this.store.settings()).language==='en'
  for(const [index,target] of targets.entries()){
   signal.throwIfAborted()
   const chunkDirectory=path.join(directory,String(index));await fs.mkdir(chunkDirectory)
   const result=await this.runner(this.python,this.script,{input:remainder?this.store.assetPath(projectId,remainder.assetId):inputFile,output:chunkDirectory,device,targets:[target]},signal,p=>this.emit({phase:'separating',stem:target.id,progress:(index+p.progress)/targets.length}))
   const staged:string[]=[],outputs:Track[]=[]
   let published=false
   try{
    for(const [i,file] of [{stem:'other',path:result.other},...result.outputs].entries()){
     signal.throwIfAborted()
     const meta=await inspectWave(file.path)
     if(meta.sampleRate!==source.sampleRate||meta.channels!==source.channels||Math.abs(meta.duration-clipDuration(clip))>1/source.sampleRate)throw new Error('Separation result is not aligned with source')
     const assetId=randomUUID(),destination=this.store.assetPath(projectId,assetId)
     await fs.rename(file.path,destination);staged.push(destination)
     outputs.push({id:randomUUID(),assetId,name:stemLabel(file.stem,en),role:i===0?'other':'stem',stem:file.stem,parentId:source.id,color:stemColor(file.stem),gain:source.gain,muted:source.muted,solo:source.solo,...meta})
    }
    for(const output of outputs)output.clips=[{id:output.id,name:output.name,start:0,end:output.duration,offset:clip.offset}]
    const previousRemainder=remainder
    await this.store.update(projectId,current=>{
     signal.throwIfAborted()
     if(current.tracks.find(t=>t.id===source.id)?.assetId!==source.assetId)throw new Error('Source track changed')
     if(!previousRemainder)return {...commitSeparation(current,source.id,outputs,clip),monitor:'stems',lastSeparation:{...current.lastSeparation!,completed:index+1,retrySourceId:outputs[0].id}}
     const position=current.tracks.findIndex(t=>t.id===previousRemainder.id),last=current.tracks.findIndex(t=>t.id===lastStemId)
     if(position<0||last<0)throw new Error('Progressive results changed')
     const tracks=[...current.tracks],old=tracks[position]
     tracks[position]={...outputs[0],name:old.name,gain:old.gain,muted:old.muted,solo:old.solo}
     tracks.splice(last+1,0,outputs[1])
     return {...current,tracks,lastSeparation:{...current.lastSeparation!,completed:index+1,retrySourceId:outputs[0].id},updatedAt:new Date().toISOString()}
    })
    published=true;remainder=outputs[0];lastStemId=outputs[1].id
    this.emit({phase:'separating',stem:target.id,progress:(index+1)/targets.length,completedStems:index+1,retrySourceId:remainder.id,remainingTargets:targets.slice(index+1).map(t=>t.id)})
   }finally{
    if(!published)await Promise.all(staged.map(file=>fs.rm(file,{force:true})))
   }
  }
 }

}
