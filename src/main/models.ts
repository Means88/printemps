import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, promises as fs } from 'node:fs'
import path from 'node:path'
import manifest from '../shared/model-manifest.json'
export type ModelFile={path:string;bytes:number;checksum:string;checksumAlgorithm:string}
export type ModelEntry={id:string;weight:ModelFile;config:ModelFile;totalBytes:number}
export type ModelStatus={id:string;bytes:number;cached:boolean}
export type DownloadProgress={modelId:string;received:number;total:number;phase:'cached'|'downloading'}
export const DEFAULT_HF_ENDPOINT='https://huggingface.co'
export const HF_ENDPOINT_PRESETS=[DEFAULT_HF_ENDPOINT,'https://hf-mirror.com'] as const
/** Normalise a weights host to `scheme://host[:port]`; empty keeps the default. */
export function normalizeEndpoint(value:string):string{
 const text=value.trim();if(!text)return ''
 let url:URL
 try{url=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text)?text:`https://${text}`)}catch{throw new Error('Invalid download source')}
 if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error('Download source must be http or https')
 if(!url.hostname)throw new Error('Download source needs a host')
 if((url.pathname&&url.pathname!=='/')||url.search||url.hash)throw new Error('Download source must be scheme, host and port only')
 if(url.username||url.password)throw new Error('Do not put credentials in the download source')
 return `${url.protocol}//${url.host}`
}
/** Where a model file lives on the chosen host. */
export function modelBaseUrl(endpoint:string){return `${endpoint||DEFAULT_HF_ENDPOINT}/${manifest.repository}/resolve/${manifest.revision}/`}
export class ModelCache {
 private active=new Set<string>()
 constructor(readonly directory:string,private catalog:ModelEntry[]=manifest.models,private base=`https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/`,private fetcher:typeof fetch=fetch){}
 entry(id:string){const model=this.catalog.find(m=>m.id===id);if(!model)throw new Error('Unknown model');return model}
 location(file:ModelFile){return path.join(this.directory,path.basename(file.path))}
 async verified(file:ModelFile){
  try{
   const filename=this.location(file),stat=await fs.stat(filename)
   if(stat.size!==file.bytes)return false
   const hash=createHash(file.checksumAlgorithm==='git-sha1'?'sha1':'sha256')
   if(file.checksumAlgorithm==='git-sha1')hash.update(`blob ${stat.size}\0`)
   for await(const chunk of createReadStream(filename))hash.update(chunk)
   return hash.digest('hex')===file.checksum
  }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e}
 }
 async list():Promise<ModelStatus[]>{
  const statuses:ModelStatus[]=[]
  for(const m of this.catalog)statuses.push({id:m.id,bytes:m.totalBytes,cached:await this.verified(m.weight)&&await this.verified(m.config)})
  return statuses
 }
 async remove(id:string){
  if(this.active.has(id))throw new Error('Model is in use')
  const m=this.entry(id);await Promise.all([m.weight,m.config].map(f=>fs.rm(this.location(f),{force:true})))
 }
 async ensure(id:string,signal:AbortSignal,onProgress:(p:DownloadProgress)=>void){
  const model=this.entry(id)
  if(this.active.has(id))throw new Error('Model download already running')
  this.active.add(id)
  try{
   await fs.mkdir(this.directory,{recursive:true})
   let received=0
   for(const file of [model.weight,model.config]){
    signal.throwIfAborted()
    if(await this.verified(file)){received+=file.bytes;onProgress({modelId:id,received,total:model.totalBytes,phase:'cached'});continue}
    signal.throwIfAborted()
    onProgress({modelId:id,received,total:model.totalBytes,phase:'downloading'})
    const disk=await fs.statfs(this.directory)
    if(disk.bavail*disk.bsize<file.bytes+1024*1024)throw new Error('Insufficient disk space for model')
    const temp=this.location(file)+`.${randomUUID()}.part`
    try{
     const response=await this.fetcher(this.base+file.path,{signal})
     if(response.status===407)throw new Error('Proxy authentication failed (407): check the proxy address and credentials in Settings')
     if(!response.ok||!response.body)throw new Error(`Model download failed (${response.status})`)
     const hash=createHash(file.checksumAlgorithm==='git-sha1'?'sha1':'sha256')
     if(file.checksumAlgorithm==='git-sha1')hash.update(`blob ${file.bytes}\0`)
     const handle=await fs.open(temp,'wx',0o600);let written=0
     try{
      for await(const chunk of response.body){signal.throwIfAborted();written+=chunk.length;if(written>file.bytes)throw new Error('Model size mismatch');hash.update(chunk);await handle.writeFile(chunk);onProgress({modelId:id,received:received+written,total:model.totalBytes,phase:'downloading'})}
     }finally{await handle.close()}
     if(written!==file.bytes||hash.digest('hex')!==file.checksum)throw new Error('Model integrity check failed')
     signal.throwIfAborted();await fs.rename(temp,this.location(file));received+=written
    }finally{await fs.rm(temp,{force:true})}
   }
   return {weight:this.location(model.weight),config:this.location(model.config)}
  }finally{this.active.delete(id)}
 }
}
