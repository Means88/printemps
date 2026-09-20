import {validateProjectClips} from '../shared/clips'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { projectSchema, settingsSchema, type Project, type Settings } from '../shared/domain'

export class ProjectStore {
  private mutations=new Map<string,Promise<unknown>>()
  private async mutate<T>(id:string,operation:()=>Promise<T>):Promise<T> {
    const previous=this.mutations.get(id)||Promise.resolve()
    const next=previous.catch(()=>{}).then(operation)
    this.mutations.set(id,next)
    try{return await next}finally{if(this.mutations.get(id)===next)this.mutations.delete(id)}
  }
  /** Deletion and metadata/task commits share one queue; deleted projects cannot be resurrected. */
  update(id:string,change:(project:Project)=>Project|Promise<Project>):Promise<Project> {
    return this.mutate(id,async()=>this.save(await change(await this.load(id))))
  }
  constructor(readonly root: string) {}
  async initialize() { await fs.mkdir(path.join(this.root, 'projects'), {recursive:true}) }
  projectDirectory(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid project identifier')
    return path.join(this.root, 'projects', id)
  }
  assetPath(projectId: string, assetId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) throw new Error('Invalid asset identifier')
    return path.join(this.projectDirectory(projectId), 'assets', `${assetId}.wav`)
  }
  async save(project: Project) {
    const valid=validateProjectClips(projectSchema.parse(project))
    const dir=this.projectDirectory(valid.id)
    await fs.mkdir(dir,{recursive:true})
    await this.atomicWrite(path.join(dir,'project.json'),valid)
    return valid
  }
  async load(id: string): Promise<Project> {
    return validateProjectClips(projectSchema.parse(JSON.parse(await fs.readFile(path.join(this.projectDirectory(id),'project.json'),'utf8'))))
  }
  async list(): Promise<Project[]> {
    await this.initialize()
    const dirs=await fs.readdir(path.join(this.root,'projects'),{withFileTypes:true})
    const loaded=await Promise.all(dirs.filter(d=>d.isDirectory()).map(async d=>{
      try { return await this.load(d.name) } catch { return null }
    }))
    return loaded.filter((p):p is Project=>p!==null).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
  }
  remove(id: string, purge: boolean) {
    return this.mutate(id,async()=>{
      const dir=this.projectDirectory(id)
      await this.load(id)
      if (purge) await fs.rm(dir,{recursive:true})
      else {
        const archive=path.join(this.root,'archived')
        await fs.mkdir(archive,{recursive:true})
        await fs.rename(dir,path.join(archive,`${id}-${randomUUID()}`))
      }
    })
  }
  private archiveDirectory(archiveId:string) {
    if(!/^[0-9a-f-]{36}-[0-9a-f-]{36}$/i.test(archiveId))throw new Error('Invalid archived project identifier')
    return path.join(this.root,'archived',archiveId)
  }
  private async loadArchived(archiveId:string) {
    const directory=this.archiveDirectory(archiveId)
    if(!(await fs.lstat(directory)).isDirectory())throw new Error('Invalid archived project directory')
    const project=validateProjectClips(projectSchema.parse(JSON.parse(await fs.readFile(path.join(directory,'project.json'),'utf8'))))
    if(project.id!==archiveId.slice(0,36))throw new Error('Archived project identity mismatch')
    return project
  }
  async listArchived() {
    let entries
    try{entries=await fs.readdir(path.join(this.root,'archived'),{withFileTypes:true})}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error}
    const results=await Promise.all(entries.filter(e=>e.isDirectory()).map(async e=>{
      try{return {archiveId:e.name,project:await this.loadArchived(e.name)}}catch{return null}
    }))
    return results.filter((entry):entry is {archiveId:string;project:Project}=>entry!==null).sort((a,b)=>b.project.updatedAt.localeCompare(a.project.updatedAt))
  }
  async restoreArchived(archiveId:string) {
    const project=await this.loadArchived(archiveId)
    return this.mutate(project.id,async()=>{
      const current=await this.loadArchived(archiveId),destination=this.projectDirectory(current.id)
      try{await fs.lstat(destination);throw new Error('A project with this identifier already exists')}
      catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
      await fs.rename(this.archiveDirectory(archiveId),destination)
      return current
    })
  }
  async purgeArchived(archiveId:string) {
    const project=await this.loadArchived(archiveId)
    return this.mutate(project.id,async()=>{
      await this.loadArchived(archiveId)
      await fs.rm(this.archiveDirectory(archiveId),{recursive:true})
    })
  }
  /** Startup only, before accepting jobs. Preserve assets and unreadable projects. */
  async recoverInterruptedTasks() {
    for(const project of await this.list()) {
      if(project.lastSeparation?.state==='running')await this.update(project.id,current=>{
        const record=current.lastSeparation!
        // Results and completed count commit together; final status is a later write.
        // A crash between those writes must not label fully saved results interrupted.
        const complete=record.targets.length>0&&record.completed===record.targets.length
        return {...current,lastSeparation:{...record,state:complete?'complete':'interrupted',finishedAt:new Date().toISOString()}}
      })
      await fs.rm(path.join(this.projectDirectory(project.id),'tasks'),{recursive:true,force:true})
    }
  }
  async settings(): Promise<Settings> {
    try { return settingsSchema.parse(JSON.parse(await fs.readFile(path.join(this.root,'settings.json'),'utf8'))) }
    catch(e) { if ((e as NodeJS.ErrnoException).code==='ENOENT') return settingsSchema.parse({}); throw e }
  }
  async saveSettings(value: Settings) {
    const valid=settingsSchema.parse(value)
    await this.atomicWrite(path.join(this.root,'settings.json'),valid)
    return valid
  }
  private async atomicWrite(file: string,value:unknown) {
    const temp=`${file}.${randomUUID()}.tmp`
    try { await fs.writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});await fs.rename(temp,file) }
    finally { await fs.rm(temp,{force:true}) }
  }
}
