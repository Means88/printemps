import {applyClipAction} from '../src/shared/clips'
import {applyTrackAction} from '../src/shared/track-actions'
// Development-only UI fixture. Never imported by the production renderer entry.
import type {DesktopAPI,SeparationTask} from '../src/shared/api'
import type {Project,Settings,Track} from '../src/shared/domain'
import manifest from '../src/shared/model-manifest.json'
import {stemColor} from '../src/shared/stems'
import {applyProjectEdits} from '../src/shared/project-edits'
const uuid=()=>crypto.randomUUID(),en=new URLSearchParams(location.search).get('lang')==='en'
let failNextImport=new URLSearchParams(location.search).get('importFailure')==='once'
let failNextTrackSave=new URLSearchParams(location.search).get('trackSaveFailure')==='once'
let failNextClipSave=new URLSearchParams(location.search).get('clipSaveFailure')==='once'
let failNextSave=new URLSearchParams(location.search).get('saveFailure')==='once'
const names=en?['Original','Lead vocal','Drums','Bass','Electric guitar','Other']:['原始音频','主唱','鼓组','贝斯','电吉他','其它']
const stems=['original','lead-vocal','drums','bass','electric-guitar','other']
const tracks:Track[]=names.map((name,i)=>({id:uuid(),assetId:uuid(),name,role:i===0?'original':i===5?'other':'stem',stem:stems[i],color:stemColor(stems[i]),gain:i===0?0:-3,muted:false,solo:false,duration:10,sampleRate:44100,channels:2,peaks:Array.from({length:600},(_,n)=>.05+Math.abs(Math.sin(n*1.7+i)*Math.sin(n*.017+i))*.7)}))
let project:Project={schemaVersion:1,id:uuid(),name:en?'Midnight Session — layout fixture':'Midnight Session · 布局示例',sourceName:'synthetic-preview.wav',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),tracks,music:{bpm:120,key:'A minor',meter:'4/4',firstBeat:.1},recommendation:{bpm:120,key:'A minor',meter:'4/4',firstBeat:.1},metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:-6}
const count=Math.min(40,Math.max(1,Number(new URLSearchParams(location.search).get('projects'))||1))
let projects=Array.from({length:count},(_,i)=>i===0?project:{...structuredClone(project),id:uuid(),name:`${en?'Layout fixture':'布局示例'} ${String(i+1).padStart(2,'0')}`,updatedAt:new Date(Date.now()-i*60000).toISOString()}),settings:Settings={language:en?'en':'zh',device:'cpu',modelDirectory:'',exportDirectory:'',proxyMode:'system',proxyUrl:'',pythonPath:'',hfEndpoint:''}
let archived:{archiveId:string;project:Project}[]=[]
if(new URLSearchParams(location.search).get('taskStates')==='1'){
 const states=['complete','failed','cancelled','interrupted','running'] as const
 projects=projects.map((p,i)=>({...p,lastSeparation:{id:uuid(),sourceId:p.tracks[0].id,retrySourceId:p.tracks[5].id,targets:['drums','bass'],state:states[i%5],completed:i%5===0?2:1,startedAt:p.createdAt,finishedAt:i%5===4?undefined:p.updatedAt,error:i%5===1?'Fixture: second target failed':undefined}}))
}
const noopSubscription=()=>()=>{}
const separationListeners=new Set<Parameters<DesktopAPI['onSeparation']>[0]>()
if(new URLSearchParams(location.search).get('backgroundTaskPreview')==='1'){
 const taskId=uuid(),projectId=projects[0].id,sourceId=projects[0].tracks[0].id
 projects[0]={...projects[0],lastSeparation:{id:taskId,sourceId,targets:['drums'],completed:0,state:'running',startedAt:new Date().toISOString()}}
 setTimeout(()=>{
  projects=projects.map(p=>p.id===projectId?{...p,lastSeparation:{...p.lastSeparation!,state:'complete',completed:1,finishedAt:new Date().toISOString()}}:p)
  for(const listener of separationListeners)listener({id:taskId,projectId,sourceId,phase:'complete',progress:1,targets:['drums'],completedStems:1})
 },15000)
}
const modelListeners=new Set<Parameters<DesktopAPI['onModelProgress']>[0]>()
const cachedModels=new Set(manifest.models.filter((_,i)=>i%4===0).map(m=>m.id))
let cancelDownload:(()=>void)|undefined

const partial:Partial<DesktopAPI>={
 platform:'browser',
 editClip:async(id,action)=>{if(failNextClipSave){failNextClipSave=false;throw new Error('Fixture clip write failed')}const p=projects.find(p=>p.id===id)!;const next=applyClipAction(p,action,uuid);projects=projects.map(p=>p.id===id?next:p);return next},
 editTrack:async(id,action)=>{if(failNextTrackSave){failNextTrackSave=false;throw new Error('Fixture track write failed')}project=applyTrackAction(project,action);projects=projects.map(p=>p.id===id?project:p);return structuredClone(project)},
 listArchivedProjects:async()=>structuredClone(archived),restoreArchivedProject:async id=>{const item=archived.find(p=>p.archiveId===id);if(!item)throw new Error('Project not found');projects.push(item.project);archived=archived.filter(p=>p.archiveId!==id);return structuredClone(item.project)},purgeArchivedProject:async id=>{archived=archived.filter(p=>p.archiveId!==id)},
 listProjects:async()=>structuredClone(projects),openProject:async id=>{const found=projects.find(p=>p.id===id);if(!found)throw new Error('Project not found');project=found;return structuredClone(project)},importAudio:async()=>{if(failNextImport){failNextImport=false;throw new Error('/private/fixture.wav: Invalid data found when processing input')}return structuredClone(project)},
 saveProject:async (id,edits)=>{if(id!==project.id)throw new Error('Project not found');if(failNextSave){failNextSave=false;throw new Error(en?'Fixture: saving failed. Retry to keep your changes.':'测试示例：保存失败，请重试以保留修改。')}project=applyProjectEdits(project,edits);projects=projects.map(p=>p.id===project.id?project:p);return structuredClone(project)},deleteProject:async(id,purge)=>{const item=projects.find(p=>p.id===id);if(item&&!purge)archived.push({archiveId:uuid(),project:item});projects=projects.filter(p=>p.id!==id)},
 getSettings:async()=>settings,probeDevice:async()=>({cuda:false,mps:true,auto:'cpu' as const,torch:'2.11.0',backend:'' as ''|'cuda'|'rocm',missing:[] as string[],custom:false}),openDocumentation:async()=>{},exportDiagnostics:async()=>'/example/printemps-diagnostics.txt',choosePythonInterpreter:async()=>settings={...settings,pythonPath:'/opt/homebrew/envs/printemps/bin/python3'},resetPythonInterpreter:async()=>settings={...settings,pythonPath:''},saveSettings:async p=>settings={...settings,...p},settingsDirectories:async()=>({modelDirectory:'/example/model-cache',exportDirectory:'/example/exports'}),
 listModels:async()=>manifest.models.map(m=>({id:m.id,bytes:m.totalBytes,cached:cachedModels.has(m.id)})),separationStatus:async()=>null,analysisStatus:async()=>null,
 updateStatus:async()=>({phase:'development',currentVersion:'UI fixture'}),onAnalysis:noopSubscription,onSeparation:listener=>{separationListeners.add(listener);return()=>{separationListeners.delete(listener)}},onModelProgress:listener=>{modelListeners.add(listener);return()=>{modelListeners.delete(listener)}},onUpdate:noopSubscription,onCloseRequest:noopSubscription
}
if(new URLSearchParams(location.search).get('downloadPreview')==='1'){
 partial.downloadModel=id=>new Promise<void>((resolve,reject)=>{
  if(cancelDownload){reject(new Error('Fixture: download already running'));return}
  let received=0
  const timer=setInterval(()=>{received+=1;for(const listener of modelListeners)listener({modelId:id,received,total:30});if(received===30){clearInterval(timer);cancelDownload=undefined;cachedModels.add(id);resolve()}},1000)
  cancelDownload=()=>{clearInterval(timer);cancelDownload=undefined;reject(new Error('Fixture: download cancelled'))}
 })
 partial.cancelModelDownload=async()=>{cancelDownload?.()}
}
if(new URLSearchParams(location.search).get('separationDownloadPreview')==='1'){
 let task:SeparationTask|null=null,attempt=0,timer:ReturnType<typeof setInterval>|undefined
 const emit=()=>{if(task)for(const listener of separationListeners)listener({...task})}
 partial.separationStatus=async()=>task
 partial.startSeparation=async(projectId,sourceId,targets,clipId)=>{
  if(timer)clearInterval(timer)
  task={id:uuid(),projectId,sourceId,clipId,targets,stem:targets[0],phase:'downloading',progress:0,downloadModels:targets.map(id=>({id,received:0,total:manifest.models.find(model=>model.id===id)!.totalBytes,ready:false}))};attempt++;emit()
  timer=setInterval(()=>{if(!task)return;task={...task,progress:Math.min(.95,task.progress+.05)};task.downloadModels=task.downloadModels?.map(row=>row.id===task!.stem?{...row,received:Math.round(row.total*task!.progress)}:row)
   if(attempt===1&&task.progress>=.1){task={...task,phase:'failed',failurePhase:'downloading',error:'Fixture: download interrupted'};clearInterval(timer);timer=undefined}emit()
  },1000)
  return task
 }
 partial.cancelSeparation=async()=>{if(timer)clearInterval(timer);timer=undefined;if(task){task={...task,phase:'cancelled'};emit()}}
}
// Deterministic export recovery states; no files or native dialogs are created.
if(new URLSearchParams(location.search).get('exportRecoveryPreview')==='1'){
 let attempt=0
 partial.exportTracks=async(_projectId,_trackIds,_format,clipIds)=>{
  attempt++
  if(attempt===1)return {count:0,directory:'/example/exports',failure:{remainingIds:clipIds??[],trackName:'Fixture clip',message:'ENOSPC: fixture export destination is full'}}
  if(attempt===2)return {count:1,directory:'/example/exports'}
  return null
 }
 partial.openExportDirectory=async()=>{}
}
partial.onMenuCommand=()=>()=>{}
partial.syncMenu=async()=>{}
window.printemps=new Proxy(partial,{get(target,key){return target[key as keyof DesktopAPI]||(()=>Promise.reject(new Error(en?'UI preview only: this operation requires Electron.':'仅供界面预览：此操作需在 Electron 中验证。')))}}) as DesktopAPI
const originalFetch=window.fetch.bind(window)
const samples=44100*10,wav=new ArrayBuffer(44+samples*8),view=new DataView(wav)
const ascii=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i))}
ascii(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,3,true);view.setUint16(22,2,true);view.setUint32(24,44100,true);view.setUint32(28,352800,true);view.setUint16(32,8,true);view.setUint16(34,32,true);ascii(36,'data');view.setUint32(40,samples*8,true)
// Silence deliberately: schematic waveforms above are not measured audio data.
window.fetch=(input,init)=>String(input).startsWith('printemps://audio/')?Promise.resolve(new Response(wav.slice(0),{headers:{'Content-Type':'audio/wav'}})):originalFetch(input,init)
await import('../src/renderer/main')
const badge=document.createElement('div');badge.textContent=en?'UI fixture · synthetic waveforms · no model inference':'界面测试示例 · 波形为示意 · 未运行模型';badge.style.cssText='position:fixed;bottom:2px;left:8px;font:10px sans-serif;color:#a0aab8;pointer-events:none;z-index:10000';document.body.append(badge)
