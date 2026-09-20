// Development-only UI fixture. Never imported by the production renderer entry.
import type {DesktopAPI} from '../src/shared/api'
import type {Project,Settings,Track} from '../src/shared/domain'
import manifest from '../src/shared/model-manifest.json'
import {stemColor} from '../src/shared/stems'
import {applyProjectEdits} from '../src/shared/project-edits'
const uuid=()=>crypto.randomUUID(),en=new URLSearchParams(location.search).get('lang')==='en'
let failNextSave=new URLSearchParams(location.search).get('saveFailure')==='once'
const names=en?['Original','Lead vocal','Drums','Bass','Electric guitar','Other']:['原始音频','主唱','鼓组','贝斯','电吉他','其它']
const stems=['original','lead-vocal','drums','bass','electric-guitar','other']
const tracks:Track[]=names.map((name,i)=>({id:uuid(),assetId:uuid(),name,role:i===0?'original':i===5?'other':'stem',stem:stems[i],color:stemColor(stems[i]),gain:i===0?0:-3,muted:false,solo:false,duration:10,sampleRate:44100,channels:2,peaks:Array.from({length:600},(_,n)=>.05+Math.abs(Math.sin(n*1.7+i)*Math.sin(n*.017+i))*.7)}))
let project:Project={schemaVersion:1,id:uuid(),name:en?'Midnight Session — layout fixture':'Midnight Session · 布局示例',sourceName:'synthetic-preview.wav',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),tracks,music:{bpm:120,key:'A minor',meter:'4/4',firstBeat:.1},recommendation:{bpm:120,key:'A minor',meter:'4/4',firstBeat:.1},metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:-6}
let projects=[project],settings:Settings={language:en?'en':'zh',device:'cpu',modelDirectory:'',exportDirectory:''}
let archived:{archiveId:string;project:Project}[]=[]
const noopSubscription=()=>()=>{}
const partial:Partial<DesktopAPI>={
 listArchivedProjects:async()=>structuredClone(archived),restoreArchivedProject:async id=>{const item=archived.find(p=>p.archiveId===id);if(!item)throw new Error('Project not found');projects.push(item.project);archived=archived.filter(p=>p.archiveId!==id);return structuredClone(item.project)},purgeArchivedProject:async id=>{archived=archived.filter(p=>p.archiveId!==id)},
 listProjects:async()=>structuredClone(projects),openProject:async()=>structuredClone(project),importAudio:async()=>structuredClone(project),
 saveProject:async (id,edits)=>{if(id!==project.id)throw new Error('Project not found');if(failNextSave){failNextSave=false;throw new Error(en?'Fixture: saving failed. Retry to keep your changes.':'测试示例：保存失败，请重试以保留修改。')}project=applyProjectEdits(project,edits);projects=[project];return structuredClone(project)},deleteProject:async(id,purge)=>{const item=projects.find(p=>p.id===id);if(item&&!purge)archived.push({archiveId:uuid(),project:item});projects=projects.filter(p=>p.id!==id)},
 getSettings:async()=>settings,saveSettings:async p=>settings={...settings,...p},settingsDirectories:async()=>({modelDirectory:'/example/model-cache',exportDirectory:'/example/exports'}),
 listModels:async()=>manifest.models.map((m,i)=>({id:m.id,bytes:m.totalBytes,cached:i%4===0})),separationStatus:async()=>null,analysisStatus:async()=>null,
 updateStatus:async()=>({phase:'development',currentVersion:'UI fixture'}),onAnalysis:noopSubscription,onSeparation:noopSubscription,onModelProgress:noopSubscription,onUpdate:noopSubscription,onCloseRequest:noopSubscription
}
window.printemps=new Proxy(partial,{get(target,key){return target[key as keyof DesktopAPI]||(()=>Promise.reject(new Error(en?'UI preview only: this operation requires Electron.':'仅供界面预览：此操作需在 Electron 中验证。')))}}) as DesktopAPI
const originalFetch=window.fetch.bind(window)
const samples=44100*10,wav=new ArrayBuffer(44+samples*8),view=new DataView(wav)
const ascii=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i))}
ascii(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,3,true);view.setUint16(22,2,true);view.setUint32(24,44100,true);view.setUint32(28,352800,true);view.setUint16(32,8,true);view.setUint16(34,32,true);ascii(36,'data');view.setUint32(40,samples*8,true)
// Silence deliberately: schematic waveforms above are not measured audio data.
window.fetch=(input,init)=>String(input).startsWith('printemps://audio/')?Promise.resolve(new Response(wav.slice(0),{headers:{'Content-Type':'audio/wav'}})):originalFetch(input,init)
await import('../src/renderer/main')
const badge=document.createElement('div');badge.textContent=en?'UI fixture · synthetic waveforms · no model inference':'界面测试示例 · 波形为示意 · 未运行模型';badge.style.cssText='position:fixed;bottom:2px;left:8px;font:10px sans-serif;color:#a0aab8;pointer-events:none;z-index:10000';document.body.append(badge)
