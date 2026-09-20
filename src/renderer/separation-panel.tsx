import {preserveCompositionEscape} from './keyboard'
import {ModelDownloadProgress} from './model-download-progress'
import {trackClips,type ClipAction} from '../shared/clips'
import {ClipDetails} from './clip-details'
import {useMenuCommand} from './native-menu'
import {ErrorNotice} from './error-notice'
import { useEffect,useState } from 'react'
import { createPortal } from 'react-dom'
import { stemLabel,matchesStem,stemCategories,stemPresets,addStemSelection,formatModelBytes,type StemCategory } from '../shared/stems'
import { ExportDialog } from './export-dialog'
import * as Dialog from '@radix-ui/react-dialog'
import type { Project } from '../shared/domain'
import type { SeparationTask } from '../shared/api'
import {recoverSeparationTask} from '../shared/task-recovery'

export function SeparationPanel({project,sourceId,en,onComplete,beforeExport,collapsed,onBusyChange,clipId,onEditClip}:{project:Project;sourceId:string;en:boolean;onComplete:(id:string)=>void;beforeExport:()=>Promise<void>;collapsed:boolean;clipId:string;onEditClip:(action:ClipAction)=>Promise<void>;onBusyChange:(busy:boolean)=>void}){
 const [category,setCategory]=useState<StemCategory>('all')
 const [configuredSource,setConfiguredSource]=useState(''),[configuredClip,setConfiguredClip]=useState<string|undefined>()
 const [open,setOpen]=useState(false),[models,setModels]=useState<{id:string;bytes:number;cached:boolean}[]>([]),[selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState(''),[task,setTask]=useState<SeparationTask|null>(null),[error,setError]=useState(''),[starting,setStarting]=useState(false)
 const t=(zh:string,english:string)=>en?english:zh
 const source=project.tracks.find(track=>track.id===sourceId)||project.tracks[0]
 const clip=trackClips(source).find(c=>c.id===clipId&&!c.hidden)
 useEffect(()=>{
  let mounted=true,completedStems=0,receivedEvent=false
  let previousPhase:SeparationTask['phase']|undefined
  const receive=(next:SeparationTask)=>{
   if(!mounted||next.projectId!==project.id)return
   setTask(next)
   if(next.phase==='downloading'&&previousPhase!=='downloading')setOpen(true)
   if(next.phase==='failed'&&next.failurePhase==='downloading')setOpen(true)
   previousPhase=next.phase
   if(next.phase==='waiting'||next.phase==='separating'||next.phase==='complete'||next.phase==='cancelled')setOpen(false)
   const refresh=next.phase==='complete'||(next.completedStems||0)>completedStems
   completedStems=next.completedStems||0
   if(refresh)onComplete(project.id)
  }
  const unsubscribe=window.printemps.onSeparation(next=>{receivedEvent=true;receive(next)})
  window.printemps.separationStatus().then(next=>{if(mounted&&!receivedEvent){const current=next?.projectId===project.id?next:recoverSeparationTask(project);if(current)receive(current)}}).catch(e=>{if(mounted)setError(String(e))})
  return ()=>{mounted=false;unsubscribe()}
 },[project.id,onComplete])
 const downloadFailure=task?.phase==='failed'&&task.failurePhase==='downloading'
 const active=task&&(task.phase==='waiting'||task.phase==='downloading'||task.phase==='separating')
 useEffect(()=>{onBusyChange(!!active||starting);return()=>onBusyChange(false)},[!!active,starting,onBusyChange])
 async function configure(id=source.id,retain=false){setConfiguredSource(id);setConfiguredClip(retain?(task?.retrySourceId?undefined:task?.clipId):clip?.id);setError('');if(!retain){setSelected([]);setTask(null)}else if(task?.targets)setSelected(task.remainingTargets?.length?task.remainingTargets:task.targets);setQuery('');setCategory('all');setOpen(true);try{setModels(await window.printemps.listModels())}catch(e){setError(String(e))}}
 async function start(){setStarting(true);setError('');try{await beforeExport();await window.printemps.startSeparation(project.id,configuredSource,selected,configuredClip);const next=await window.printemps.separationStatus();setTask(next);setOpen(next?.phase==='downloading')}catch(e){setError(String(e))}finally{setStarting(false)}}
 useMenuCommand('separate',()=>{if(clip&&!active&&!starting&&!source.hidden&&((project.monitor==='original')===(source.role==='original')))void configure()})
 const recoverySummary=task&&(task.completedStems||0)>0?t(`已保留 ${task.completedStems} 个声部。重试将从剩余音轨继续。`,`${task.completedStems} completed stem${task.completedStems===1?'':'s'} retained. Retry continues from the remaining audio.`):''
 const taskHost=document.getElementById(`task-after-${project.tracks.find(t=>t.id===task?.sourceId)?.role==='original'?'original':task?.sourceId}`)
 const dialogSource=project.tracks.find(track=>track.id===((active||downloadFailure)?task?.sourceId:configuredSource))
 const dialogClipId=(active||downloadFailure)?task?.clipId:configuredClip
 const dialogClips=dialogSource?trackClips(dialogSource):[]
 const dialogClip=dialogClipId?dialogClips.find(clip=>clip.id===dialogClipId):dialogClips.length===1?dialogClips[0]:undefined
 const bytes=models.filter(m=>selected.includes(m.id)&&!m.cached).reduce((s,m)=>s+m.bytes,0)
 return <><aside className={`inspector ${collapsed?'inspector-collapsed':''}`}>{!collapsed&&<><h2>{t('剪辑详情','Clip details')}</h2>{clip?<ClipDetails track={source} clip={clip} en={en} disabled={!!active||starting||(project.monitor==='original')!==(source.role==='original')} onEdit={onEditClip}/>:<p>{t('选择一个剪辑','Select a clip')}</p>}<div className="inspector-actions"><button className="primary" disabled={!clip||!!active||starting||source.hidden||(project.monitor==='original')!==(source.role==='original')} onClick={()=>void configure()}>{t('分离','Separate')}</button><ExportDialog project={project} en={en} trackId={source.id} clipId={clip?.id} disabled={source.hidden||(project.monitor==='original')!==(source.role==='original')} beforeExport={beforeExport}/></div>{active&&task.phase==='downloading'&&<button onClick={()=>setOpen(true)}>{t('查看下载','Show download')}</button>}{task&&task.phase==='failed'&&<div>{recoverySummary&&<p>{recoverySummary}</p>}<ErrorNotice kind={downloadFailure?'download':'separation'} message={task.error||'Separation failed'} en={en}/><button onClick={()=>void configure(task.retrySourceId||task.sourceId,true)}>{t('重试','Retry')}</button></div>}{error&&<ErrorNotice message={error} en={en}/>}</>}</aside>
 {active&&(task.phase==='separating'||task.phase==='waiting')&&taskHost&&createPortal(<div className="separation-loading" role="status"><span className="spinner"/><div><strong>{task.phase==='waiting'?t('等待分离','Waiting for separation'):t('正在分离','Separating')} · {stemLabel(task.stem||'',en)}</strong><div className="task-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(task.progress*100)}><div style={{width:`${Math.max(0,Math.min(1,task.progress))*100}%`}}/></div></div><span>{Math.round(task.progress*100)}%</span><button onClick={()=>window.printemps.cancelSeparation(task.id)}>{t('取消','Cancel')}</button></div>,taskHost)}
 {task&&(task.phase==='failed'||task.phase==='cancelled')&&taskHost&&createPortal(<div className="separation-loading task-recovery"><div>{recoverySummary&&<p>{recoverySummary}</p>}<strong>{task.phase==='failed'?t('分离失败','Separation failed'):t('分离已取消','Separation cancelled')}</strong>{task.phase==='failed'?<ErrorNotice kind={downloadFailure?'download':'separation'} message={task.error||'Separation failed'} en={en}/>:<p>{t('源音轨已保留','Source track retained')}</p>}</div><button onClick={()=>void configure(task.retrySourceId||task.sourceId,true)}>{t('重试','Retry')}</button><button onClick={()=>setTask(null)}>{t('关闭','Dismiss')}</button></div>,taskHost)}
 <Dialog.Root open={open} onOpenChange={value=>{if(!starting&&!active)setOpen(value)}}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content onEscapeKeyDown={preserveCompositionEscape} className="dialog separation-dialog" data-mode={active||downloadFailure?'download':'setup'}><Dialog.Title>{active||downloadFailure?t('下载模型','Downloading models'):t('选择分离声部','Choose stems')}</Dialog.Title><Dialog.Description>{dialogClip?.name??dialogSource?.name}</Dialog.Description>{task?.phase==='failed'&&<ErrorNotice kind={downloadFailure?'download':'separation'} message={task.error||'Separation failed'} en={en}/>}
 {active||downloadFailure?<><ModelDownloadProgress task={task!} project={project} en={en}/><div className="dialog-actions"><button onClick={()=>setOpen(false)}>{t('返回工作区','Back to workspace')}</button>{downloadFailure?<button className="primary" disabled={starting} onClick={start}>{t('重试','Retry')}</button>:<button onClick={()=>window.printemps.cancelSeparation(task!.id)}>{t('取消下载','Cancel download')}</button>}</div></>:<><div className="stem-search-tools"><input aria-label={t('搜索声部','Search stems')} placeholder={t('搜索声部','Search stems')} value={query} onChange={e=>setQuery(e.target.value)}/><div className="stem-presets" aria-label={t('常用组合','Presets')}>{stemPresets.map(preset=><button key={preset.id} onClick={()=>setSelected(current=>addStemSelection(current,preset.stems))}>{en?preset.en:preset.zh}</button>)}</div></div><div className="stem-selection-body"><div className="stem-categories" aria-label={t('声部分类','Stem categories')}>{Object.entries(stemCategories).map(([id,labels])=><button key={id} aria-pressed={category===id} className={category===id?'selected':''} onClick={()=>setCategory(id as StemCategory)}>{labels[en?1:0]}</button>)}</div><div className="stem-selection-results"><div className="stem-options">{models.filter(m=>matchesStem(m.id,query,category)).map(model=><label key={model.id}><input type="checkbox" checked={selected.includes(model.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,model.id]:current.filter(id=>id!==model.id))}/><span>{stemLabel(model.id,en)}<small>{model.id}</small><small className={model.cached?'cached-model':''}>{model.cached?t('已缓存','Cached'):formatModelBytes(model.bytes)}</small></span></label>)}</div>{!models.some(m=>matchesStem(m.id,query,category))&&<p>{t('没有匹配的声部，请尝试其它关键词或分类。','No matching stems. Try another search or category.')}</p>}{!!selected.length&&<div className="selected-stems">{selected.map(id=><button key={id} aria-label={t('取消选择 ','Remove ')+stemLabel(id,en)} onClick={()=>setSelected(current=>current.filter(value=>value!==id))}>{stemLabel(id,en)} ×</button>)}<button onClick={()=>setSelected([])}>{t('清空','Clear')}</button></div>}</div><aside className="stem-summary"><h3>{t('分离摘要','Summary')}</h3><strong>{selected.length} {t('个声部',selected.length===1?'stem':'stems')}</strong><small>{models.filter(m=>selected.includes(m.id)&&m.cached).length} {t('个已缓存','cached')} · {models.filter(m=>selected.includes(m.id)&&!m.cached).length} {t('个待下载','to download')}</small><dl><dt>{t('本次下载','Download')}</dt><dd>{formatModelBytes(bytes)}</dd></dl><small>BS-Roformer Mega · v1</small></aside></div>{error&&<ErrorNotice message={error} en={en}/>}<div className="dialog-actions"><Dialog.Close>{t('取消','Cancel')}</Dialog.Close><button className="primary" disabled={!selected.length||starting} onClick={start}>{t('开始分离','Start separation')}</button></div></>}
 </Dialog.Content></Dialog.Portal></Dialog.Root></>
}
