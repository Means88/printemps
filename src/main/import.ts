import {promises as fs} from 'node:fs'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {ProjectStore} from './store'
import {transcode,inspectWave} from './audio'
import {stemColor,stemLabel} from '../shared/stems'
import type {Project} from '../shared/domain'
export class AudioImporter {
 private busy=false
 constructor(private store:ProjectStore){}
 async import(source:string):Promise<Project>{
  if(this.busy)throw new Error('Another audio import is running')
  if(typeof source!=='string'||!path.isAbsolute(source)||!['.wav','.flac','.mp3','.m4a','.aiff','.aif','.ogg'].includes(path.extname(source).toLowerCase()))throw new Error('Choose one supported local audio file')
  this.busy=true
  const id=randomUUID(),assetId=randomUUID(),dir=this.store.projectDirectory(id)
  try{
   if(!(await fs.stat(source)).isFile())throw new Error('Choose an audio file, not a directory')
   await fs.mkdir(path.join(dir,'assets'),{recursive:true})
   const target=this.store.assetPath(id,assetId);await transcode(source,target)
   const meta=await inspectWave(target),date=new Date().toISOString(),settings=await this.store.settings()
   return await this.store.save({schemaVersion:1,id,name:path.parse(source).name.trim().slice(0,80)||'Untitled',sourceName:path.basename(source),createdAt:date,updatedAt:date,
    tracks:[{id:randomUUID(),assetId,name:stemLabel('original',settings.language==='en'),role:'original',stem:'original',color:stemColor('original'),gain:0,muted:false,solo:false,...meta}],
    music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0})
  }catch(error){await fs.rm(dir,{recursive:true,force:true});throw error}
  finally{this.busy=false}
 }
}
