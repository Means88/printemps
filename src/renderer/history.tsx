import {useEffect,useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {ArrowLeftIcon} from '@radix-ui/react-icons'
import type {Project} from '../shared/domain'
type Archived={archiveId:string;project:Project}
export function History({projects,en,onOpen,onRefresh,onBack}:{projects:Project[];en:boolean;onOpen:(p:Project)=>void;onRefresh:()=>Promise<void>;onBack:()=>void}){
 const [query,setQuery]=useState(''),[deleting,setDeleting]=useState<{project:Project;archiveId?:string}|null>(null),[purge,setPurge]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [archived,setArchived]=useState<Archived[]>([]),[showArchived,setShowArchived]=useState(false)
 const t=(a:string,b:string)=>en?b:a
 useEffect(()=>{let current=true;window.printemps.listArchivedProjects().then(items=>{if(current)setArchived(items)}).catch(e=>{if(current)setError(String(e))});return()=>{current=false}},[])
 async function refresh(){await onRefresh();setArchived(await window.printemps.listArchivedProjects())}
 async function restore(id:string){setBusy(true);setError('');try{await window.printemps.restoreArchivedProject(id);await refresh()}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function remove(){if(!deleting)return;setBusy(true);setError('');try{
  if(deleting.archiveId)await window.printemps.purgeArchivedProject(deleting.archiveId)
  else await window.printemps.deleteProject(deleting.project.id,purge)
  setDeleting(null);await refresh()
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 const items:{project:Project;archiveId?:string}[]=showArchived?archived:projects.map(project=>({project}))
 const filtered=items.filter(({project:p})=>`${p.name} ${p.sourceName} ${p.tracks.map(t=>`${t.name} ${t.stem}`).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
 return <><main className="history-page">
  <div className="history-heading"><button className="icon" aria-label={t('返回首页','Back to home')} onClick={onBack}><ArrowLeftIcon/></button><div><h1>{showArchived?t('已删除项目','Deleted projects'):t('全部项目','All projects')}</h1><p>{showArchived?t('恢复保留的项目，或永久删除以释放空间。','Restore retained projects, or delete permanently to free space.'):t('搜索音频、项目或声部名称。','Search audio, project or stem names.')}</p></div><span>{items.length} {t('个项目',items.length===1?'project':'projects')}</span></div>
  <div className="history-tools"><input aria-label={t('搜索项目','Search projects')} placeholder={t('搜索项目、音频或声部','Search projects, audio or stems')} value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy} aria-pressed={showArchived} onClick={()=>{setShowArchived(!showArchived);setQuery('')}}>{showArchived?t('全部项目','All projects'):t('已删除','Deleted')}</button></div>
  {!deleting&&error&&<p role="alert">{error}</p>}
  <div className="history-list">{filtered.map(item=><div key={item.archiveId||item.project.id} className="history-row">
   {item.archiveId?<div className="history-info"><strong>{item.project.name}</strong><small>{item.project.sourceName} · {item.project.tracks.length} {t('音轨','tracks')}</small><small>{new Date(item.project.updatedAt).toLocaleString(en?'en-US':'zh-CN')}</small></div>:<button onClick={()=>onOpen(item.project)}><strong>{item.project.name}</strong><small>{item.project.sourceName} · {item.project.tracks.length} {t('音轨','tracks')}</small><small>{new Date(item.project.updatedAt).toLocaleString(en?'en-US':'zh-CN')}</small></button>}
   {item.archiveId&&<button disabled={busy} onClick={()=>restore(item.archiveId!)}>{t('恢复','Restore')}</button>}
   <button disabled={busy} onClick={()=>{setDeleting(item);setPurge(false);setError('')}}>{item.archiveId?t('永久删除','Delete permanently'):t('删除','Delete')}</button>
  </div>)}{!filtered.length&&<p>{query?t('没有匹配项目，请尝试其它关键词。','No matching projects. Try another search.'):showArchived?t('没有保留的已删除项目。','No retained deleted projects.'):t('还没有项目。导入音频即可开始。','No projects yet. Import audio to get started.')}</p>}</div>
 </main><Dialog.Root open={!!deleting} onOpenChange={v=>{if(!v&&!busy)setDeleting(null)}}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog"><Dialog.Title>{deleting?.archiveId?t('永久删除项目？','Permanently delete project?'):t('删除项目？','Delete project?')}</Dialog.Title><Dialog.Description>{deleting?.project.name} — {t('不会删除原始文件或已经导出的副本。','Original files and exported copies are not deleted.')}</Dialog.Description>
 {!deleting?.archiveId&&<label>{t('同时清理应用保存的音频','Also remove application audio assets')}<input type="checkbox" checked={purge} disabled={busy} onChange={e=>setPurge(e.target.checked)}/></label>}
 <p>{deleting?.archiveId||purge?t('项目及内部音频将永久删除，无法恢复。','The project and internal audio will be permanently deleted. This cannot be undone.'):t('保留的项目可在“已删除”中恢复。','Retained projects can be restored from Deleted.')}</p><p role="alert">{error}</p><div className="dialog-actions"><Dialog.Close disabled={busy}>{t('取消','Cancel')}</Dialog.Close><button disabled={busy} onClick={remove}>{busy?t('正在删除…','Deleting…'):t('删除','Delete')}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root></>
}
