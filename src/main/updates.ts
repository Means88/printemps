import type { UpdateState } from '../shared/api'
export interface UpdateDriver {
 autoDownload:boolean
 autoInstallOnAppQuit:boolean
 disableDifferentialDownload:boolean
 on(event:string,listener:(value:any)=>void):unknown
 checkForUpdates():Promise<unknown>
 downloadUpdate():Promise<unknown>
 quitAndInstall(isSilent?:boolean,isForceRunAfter?:boolean):void
}
/** The installed updater owns blockmap reuse, checksum validation and full fallback. */
export class UpdateService {
 private state:UpdateState
 constructor(private driver:UpdateDriver,version:string,private enabled:boolean,private busy:()=>boolean,private notify:(state:UpdateState)=>void){
  this.state={phase:enabled?'idle':'development',currentVersion:version}
  driver.autoDownload=false;driver.autoInstallOnAppQuit=false;driver.disableDifferentialDownload=false
  driver.on('update-available',info=>this.set({phase:'available',version:String(info.version),error:undefined}))
  driver.on('update-not-available',()=>this.set({phase:'current',error:undefined}))
  driver.on('download-progress',p=>this.set({phase:'downloading',percent:Math.max(0,Math.min(100,Number(p.percent)||0)),transferred:Math.max(0,Number(p.transferred)||0),total:Math.max(0,Number(p.total)||0)}))
  driver.on('update-downloaded',info=>this.set({phase:'ready',version:String(info.version),percent:100,error:undefined}))
  driver.on('error',error=>this.set({phase:'error',error:error instanceof Error?error.message:String(error)}))
 }
 status(){return {...this.state}}
 private set(patch:Partial<UpdateState>){this.state={...this.state,...patch};this.notify(this.status())}
 async check(){
  if(!this.enabled)return this.status()
  if(['checking','downloading','ready','installing'].includes(this.state.phase))return this.status()
  this.set({phase:'checking',error:undefined,version:undefined,percent:undefined,transferred:undefined,total:undefined})
  try{const result=await this.driver.checkForUpdates();if(result===null)this.set({phase:'error',error:'Update metadata is unavailable'})}
  catch(error){this.set({phase:'error',error:error instanceof Error?error.message:String(error)})}
  return this.status()
 }
 async download(){
  if(!this.enabled||this.state.phase!=='available')throw new Error('Check for an available update first')
  this.set({phase:'downloading',percent:0,error:undefined})
  try{await this.driver.downloadUpdate()}
  catch(error){this.set({phase:'error',error:error instanceof Error?error.message:String(error)})}
  return this.status()
 }
 install(){
  if(!this.enabled||this.state.phase!=='ready')throw new Error('No downloaded update is ready')
  if(this.busy())throw new Error('Wait for audio tasks and saving to finish before restarting')
  this.set({phase:'installing',error:undefined})
  try{this.driver.quitAndInstall(false,true)}catch(error){this.set({phase:'ready',error:error instanceof Error?error.message:String(error)});throw error}
 }
}
