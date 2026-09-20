import {promises as fs} from 'node:fs'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {ProjectStore} from './store'
import type {Settings} from '../shared/domain'
export type DirectoryKind='modelDirectory'|'exportDirectory'
const preferences=z.object({language:z.enum(['zh','en']).optional(),device:z.enum(['auto','cpu','cuda','mps']).optional()}).strict()
export class SettingsService {
 private queue:Promise<unknown>=Promise.resolve()
 constructor(private store:ProjectStore,private modelBusy:()=>boolean){}
 private change(update:(settings:Settings)=>Promise<Settings>|Settings){
  const next=this.queue.catch(()=>{}).then(async()=>this.store.saveSettings(await update(await this.store.settings())))
  this.queue=next;return next
 }
 save(value:unknown){const patch=preferences.parse(value);return this.change(current=>({...current,...patch}))}
 setDirectory(kind:DirectoryKind,directory:string){
  if(!['modelDirectory','exportDirectory'].includes(kind))throw new Error('Invalid directory type')
  return this.change(async current=>{
   if(kind==='modelDirectory'&&this.modelBusy())throw new Error('Wait for model tasks to finish before changing the cache directory')
   if(!directory)return {...current,[kind]:''}
   if(!path.isAbsolute(directory))throw new Error('Choose an absolute directory')
   const real=await fs.realpath(directory),root=await fs.realpath(this.store.root),relative=path.relative(root,real)
   if(relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep)))throw new Error('Choose a folder outside private application storage')
   if(!(await fs.stat(real)).isDirectory())throw new Error('Choose a directory')
   const probe=path.join(real,`.printemps-write-check-${randomUUID()}`)
   try{await fs.writeFile(probe,'',{flag:'wx',mode:0o600})}finally{await fs.rm(probe,{force:true})}
   // A task may have started while the native picker or filesystem probe was running.
   if(kind==='modelDirectory'&&this.modelBusy())throw new Error('Wait for model tasks to finish before changing the cache directory')
   return {...current,[kind]:real}
  })
 }
 async directories(){const current=await this.store.settings();return {modelDirectory:current.modelDirectory||path.join(this.store.root,'models'),exportDirectory:current.exportDirectory}}
}
