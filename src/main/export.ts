import {trackClips} from '../shared/clips'
import {trimFilter} from './clip-audio'
import { constants, promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import type { ProjectStore } from './store'
export type ExportAlignment='clip'|'timeline'
type ExportPlan=Readonly<{projectId:string;projectName:string;format:'wav'|'flac';alignment:ExportAlignment;tracks:ReadonlyArray<Readonly<{id:string;assetId:string;name:string;start:number;end:number;offset:number;sampleRate:number}>>}>

export function safeFilename(name:string){
 const cleaned=name.normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100)
 return !cleaned||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)?`track_${cleaned}`:cleaned
}
/** Timeline alignment prepends silence equal to the clip's project offset so exports line up in a DAW. */
export function exportFilter(range:{start:number;end:number;offset:number;sampleRate:number},alignment:ExportAlignment){
 const lead=alignment==='timeline'?Math.round(Math.max(0,range.offset)*1000):0
 return lead>0?`${trimFilter(range,range.sampleRate)},adelay=${lead}:all=1`:trimFilter(range,range.sampleRate)
}
async function encode(input:string,output:string,format:'wav'|'flac',range:{start:number;end:number;offset:number;sampleRate:number},alignment:ExportAlignment){
 if(!ffmpeg)throw new Error('Audio encoder unavailable')
 const executable=ffmpeg.replace('app.asar','app.asar.unpacked')
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(executable,['-nostdin','-v','error','-i',input,'-af',exportFilter(range,alignment),'-c:a',format==='wav'?'pcm_s24le':'flac','-sample_fmt',format==='wav'?'s32':'s32','-f',format,'-y',output],{windowsHide:true})
  let errors='';child.stderr.on('data',b=>{errors=(errors+b.toString()).slice(-2000)})
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(errors||'Export failed')))
 })
}
export class PartialExportError extends Error {
 constructor(readonly files:string[],readonly remainingIds:string[],readonly trackName:string,cause:unknown){
  super(cause instanceof Error?cause.message:String(cause));this.name='PartialExportError'
 }
}
/** Capture the user's selection before the native folder dialog yields to background jobs. */
export async function prepareExport(store:ProjectStore,projectId:string,ids:string[],format:'wav'|'flac',clipIds?:string[],options?:{alignment?:ExportAlignment}):Promise<ExportPlan>{
 if(!['wav','flac'].includes(format)||!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw new Error('Invalid export selection')
 const alignment:ExportAlignment=options?.alignment==='timeline'?'timeline':'clip'
 if(options?.alignment!==undefined&&!['clip','timeline'].includes(options.alignment))throw new Error('Invalid export alignment')
 const project=await store.load(projectId)
 if(clipIds&&(!Array.isArray(clipIds)||clipIds.length!==ids.length))throw new Error('Invalid clip selection')
 const tracks=ids.flatMap((id,index)=>{const t=project.tracks.find(t=>t.id===id);if(!t)throw new Error('Selected track was replaced. Select the current clips and retry.');const clips=trackClips(t).filter(c=>!c.hidden&&(!clipIds||c.id===clipIds[index]));if(!clips.length)throw new Error('Selected clip no longer exists');return clips.map(c=>Object.freeze({id:clipIds?c.id:t.id,assetId:t.assetId,name:t.clips?c.name:t.name,start:c.start,end:c.end,offset:c.offset,sampleRate:t.sampleRate}))})
 return Object.freeze({projectId,projectName:project.name,format,alignment,tracks:Object.freeze(tracks)})
}
/** Export creates independent files, never links to or modifies private assets. */
export async function exportPreparedTracks(store:ProjectStore,plan:ExportPlan,directory:string){
 const {tracks,format}=plan
 const real=await fs.realpath(directory),privateRoot=await fs.realpath(store.root)
 const relative=path.relative(privateRoot,real)
 if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new Error('Choose a folder outside application storage')
 const files:string[]=[]
 for(const [index,track] of tracks.entries()){
  const temp=path.join(real,`.printemps-${randomUUID()}.tmp`)
  try{
   await encode(store.assetPath(plan.projectId,track.assetId),temp,format,track,plan.alignment)
   const base=safeFilename(`${plan.projectName}_${track.name}`)
   for(let n=0;;n++){
    const target=path.join(real,`${base}${n?` (${n})`:''}.${format}`)
    try{await fs.copyFile(temp,target,constants.COPYFILE_EXCL);files.push(target);break}
    catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e}
   }
  }catch(error){throw new PartialExportError([...files],tracks.slice(index).map(t=>t.id),track.name,error)}
  finally{await fs.rm(temp,{force:true}).catch(()=>{})}
 }
 return files
}
export async function exportTracks(store:ProjectStore,projectId:string,ids:string[],directory:string,format:'wav'|'flac',options?:{alignment?:ExportAlignment}){
 return exportPreparedTracks(store,await prepareExport(store,projectId,ids,format,undefined,options),directory)
}
