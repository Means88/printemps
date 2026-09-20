import type {Project} from '../shared/domain'
import {applyProjectEdits,diffProjectEdits,type ProjectEdits} from '../shared/project-edits'

type PendingEdit={projectId:string;edits:ProjectEdits}|{projectId:string;operation:()=>Promise<Project>}
export type SaveState={pending:number;error:string|null}
type Persistence={read:(id:string)=>Promise<Project>;save:(id:string,edits:ProjectEdits)=>Promise<Project>}

/** Serialize reads/writes, while immediately reflecting edits in the workspace. */
export class ProjectSession {
 private current:Project|null=null
 private pending:PendingEdit[]=[]
 private queue:Promise<void>=Promise.resolve()
 private failure:Error|null=null
 constructor(private persistence:Persistence,private publish:(project:Project|null)=>void,private status:(state:SaveState)=>void,private report:(error:Error,source:'save'|'refresh')=>void){}
 get saveError(){return this.failure}
 open(project:Project|null){
  if(this.pending.length)throw new Error('Save pending edits before leaving the project')
  this.current=project;this.publish(project)
 }
 edit(base:Project,next:Project){
  if(this.current?.id!==base.id)return
  const edits=diffProjectEdits(base,next)
  if(!Object.keys(edits).length)return
  this.pending.push({projectId:base.id,edits})
  this.current=applyProjectEdits(this.current,edits);this.publish(this.current);this.emitStatus()
  this.enqueue(()=>this.persist(),'save')
 }
 mutate(projectId:string,operation:()=>Promise<Project>){
  if(this.current?.id!==projectId)return
  this.pending.push({projectId,operation});this.emitStatus()
  this.enqueue(()=>this.persist(),'save')
 }
 private emitStatus(){this.status({pending:this.pending.length,error:this.failure?.message??null})}
 private enqueue(operation:()=>Promise<void>,source:'save'|'refresh'){
  this.queue=this.queue.then(operation).catch(error=>this.report(error instanceof Error?error:new Error(String(error)),source))
 }
 private accept(project:Project){
  if(this.current?.id!==project.id)return
  let next=project
  for(const pending of this.pending)if(pending.projectId===project.id&&'edits' in pending)next=applyProjectEdits(next,pending.edits)
  this.current=next;this.publish(next)
 }
 private async persist(){
  try{
   while(this.pending.length){
    const pending=this.pending[0]
    const saved='operation' in pending?await pending.operation():await this.persistence.save(pending.projectId,pending.edits)
    this.pending.shift();this.accept(saved)
   }
   this.failure=null
  }catch(error){this.failure=error instanceof Error?error:new Error(String(error));throw this.failure}
  finally{this.emitStatus()}
 }
 // Arrow properties retain stable identities for React event subscriptions.
 refresh=(id:string)=>{this.enqueue(async()=>{this.accept(await this.persistence.read(id))},'refresh')}
 retry=()=>{this.enqueue(()=>this.persist(),'save')}
 flush=async()=>{
  let pending:Promise<void>
  do{pending=this.queue;await pending}while(pending!==this.queue)
  if(this.failure)throw this.failure
 }
}
