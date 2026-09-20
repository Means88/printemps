import {preserveCompositionEscape} from './keyboard'
import {trackClips,clipDuration} from '../shared/clips'
import {formatTimecode} from '../shared/timecode'
import {useEffect,useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {ArrowLeftIcon,TrashIcon,BarChartIcon,MagnifyingGlassIcon} from '@radix-ui/react-icons'
import {paginate} from '../shared/pagination'
import {matchesProject} from '../shared/project-search'
import {ExportDialog} from './export-dialog'
import type {Project} from '../shared/domain'
const taskLabels={running:['处理中','Running'],complete:['已完成','Complete'],failed:['失败','Failed'],cancelled:['已取消','Cancelled'],interrupted:['已中断','Interrupted']} as const
function taskLabel(project:Project,en:boolean){const task=project.lastSeparation;return task?`${taskLabels[task.state][en?1:0]} · ${task.completed}/${task.targets.length}`:en?'No task record':'暂无任务记录'}
type Archived={archiveId:string;project:Project}
export function History({projects,en,onOpen,onRefresh,onBack}:{projects:Project[];en:boolean;onOpen:(p:Project)=>void;onRefresh:()=>Promise<void>;onBack:()=>void}){
 const [query,setQuery]=useState(''),[deleting,setDeleting]=useState<{project:Project;archiveId?:string}|null>(null),[purge,setPurge]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [archived,setArchived]=useState<Archived[]>([]),[showArchived,setShowArchived]=useState(false)
 const [selectedId,setSelectedId]=useState<string|null>(null),[sort,setSort]=useState<'recent'|'name'>('recent')
 const [page,setPage]=useState(0),[resultFilter,setResultFilter]=useState<'all'|'results'|'empty'>('all')
 const [taskFilter,setTaskFilter]=useState('all')
 const [selectedResult,setSelectedResult]=useState<string|null>(null)
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
 const filtered=items.filter(({project:p})=>taskFilter==='all'||(p.lastSeparation?.state||'none')===taskFilter).filter(({project:p})=>resultFilter==='all'||(p.tracks.some(track=>track.role!=='original')?resultFilter==='results':resultFilter==='empty')).filter(({project:p})=>matchesProject(p,query)).sort((a,b)=>sort==='name'?a.project.name.localeCompare(b.project.name,en?'en':'zh-CN'):b.project.updatedAt.localeCompare(a.project.updatedAt))
 const result=paginate(filtered,page,4)
 const selected=!showArchived?(result.items.find(item=>item.project.id===selectedId)||result.items[0])?.project:undefined
 const resultClips=selected?.tracks.filter(track=>track.role!=='original'&&!track.hidden).flatMap(track=>trackClips(track).filter(clip=>!clip.hidden).map(clip=>({track,clip})))??[]
 const exportSelection=resultClips.find(({clip})=>clip.id===selectedResult)
 useEffect(()=>setSelectedResult(null),[selected?.id])
 useEffect(()=>{if(page!==result.page)setPage(result.page)},[page,result.page])
 return <><main className="history-page">
  <div className="eyebrow">YOUR SESSIONS</div>
  <div className="history-heading"><button className="icon" aria-label={t('返回首页','Back to home')} onClick={onBack}><ArrowLeftIcon/></button><div><h1>{showArchived?t('已删除项目','Deleted projects'):t('全部项目','All projects')}</h1></div><button disabled={busy} aria-pressed={showArchived} onClick={()=>{setShowArchived(!showArchived);setQuery('');setPage(0)}}>{showArchived?t('全部项目','All projects'):t('已删除','Deleted')}</button></div>
  <div className={`history-content ${selected?'has-inspector':''}`}><section className="history-browser"><div className="history-tools"><label className="history-search"><MagnifyingGlassIcon/><input aria-label={t('搜索项目','Search projects')} placeholder={t('搜索项目、音频或声部','Search projects, audio or stems')} value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label><select aria-label={t('结果筛选','Filter results')} value={resultFilter} onChange={e=>{setResultFilter(e.target.value as 'all'|'results'|'empty');setPage(0)}}><option value="all">{t('全部结果','All results')}</option><option value="results">{t('已有分离结果','Has results')}</option><option value="empty">{t('尚无分离结果','No results')}</option></select><select aria-label={t('任务状态','Task status')} value={taskFilter} onChange={e=>{setTaskFilter(e.target.value);setPage(0)}}><option value="all">{t('全部状态','All statuses')}</option>{Object.entries(taskLabels).map(([value,labels])=><option key={value} value={value}>{labels[en?1:0]}</option>)}<option value="none">{t('暂无记录','No task record')}</option></select><select aria-label={t('项目排序','Sort projects')} value={sort} onChange={e=>{setSort(e.target.value as 'recent'|'name');setPage(0)}}><option value="recent">{t('最近处理','Recently updated')}</option><option value="name">{t('名称','Name')}</option></select></div>
  {!deleting&&error&&<p role="alert">{error}</p>}
  <small className="history-count">{filtered.length} {t('条记录',filtered.length===1?'record':'records')}</small>
  <div className="history-table-heading" aria-hidden="true"><span>{t('音频 / 分离结果','Audio / results')}</span><span>{t('处理时间','Updated')}</span><span>{t('状态','Status')}</span><span/></div>
  <div className="history-list">{result.items.map(item=><div key={item.archiveId||item.project.id} className={`history-row ${selected?.id===item.project.id?'history-row-selected':''}`}>
   {item.archiveId?<div className="history-info"><BarChartIcon/><div><strong>{item.project.name}</strong><small>{item.project.sourceName}</small><small>{item.project.tracks.length} {t('音轨','tracks')}</small></div></div>:<button className="history-project" aria-pressed={selected?.id===item.project.id} onClick={()=>setSelectedId(item.project.id)} onDoubleClick={()=>onOpen(item.project)}><BarChartIcon/><div><strong title={item.project.name}>{item.project.name}</strong><small title={item.project.sourceName}>{item.project.sourceName}</small><small title={item.project.tracks.filter(track=>track.role!=='original'&&!track.hidden).map(track=>track.name).join(' · ')}>{item.project.tracks.filter(track=>track.role!=='original'&&!track.hidden).map(track=>track.name).join(' · ')||t('尚无分离结果','No results')}</small></div></button>}
   <time dateTime={item.project.updatedAt} title={new Date(item.project.updatedAt).toLocaleString(en?'en-US':'zh-CN')}>{new Date(item.project.updatedAt).toLocaleString(en?'en-GB':'zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time>
   <span className="history-task-state" data-state={item.project.lastSeparation?.state||'none'}>{item.project.lastSeparation?taskLabels[item.project.lastSeparation.state][en?1:0]:t('暂无任务','No task')}</span>
   <div className="history-row-actions">{item.archiveId?<button disabled={busy} onClick={()=>restore(item.archiveId!)}>{t('恢复','Restore')}</button>:<button onClick={()=>onOpen(item.project)}>{t('试听','Listen')}</button>}
   <button className="icon" disabled={busy} aria-label={`${item.archiveId?t('永久删除','Delete permanently'):t('删除','Delete')} ${item.project.name}`} title={item.archiveId?t('永久删除','Delete permanently'):t('删除','Delete')} onClick={()=>{setDeleting(item);setPurge(false);setError('')}}><TrashIcon/></button></div>
  </div>)}{!filtered.length&&<p>{query||resultFilter!=='all'||taskFilter!=='all'?t('没有匹配项目，请调整关键词或筛选条件。','No matching projects. Adjust your search or filters.'):showArchived?t('没有保留的已删除项目。','No retained deleted projects.'):t('还没有项目。导入音频即可开始。','No projects yet. Import audio to get started.')}</p>}</div>
 <nav className="history-pagination" aria-label={t('项目分页','Project pages')}><span aria-live="polite">{result.from}–{result.to} / {result.total}</span><button disabled={busy||result.page===0} onClick={()=>setPage(result.page-1)}>{t('上一页','Previous')}</button><button disabled={busy||result.page===result.pages-1} onClick={()=>setPage(result.page+1)}>{t('下一页','Next')}</button></nav></section>
 {selected&&<aside className="history-inspector" aria-label={t('记录详情','Project details')}><small>{t('记录详情','Project details')}</small><h2 title={selected.name}>{selected.name}</h2><p title={selected.sourceName}>{selected.sourceName}</p><p>{t('最近任务：','Latest task: ')}{taskLabel(selected,en)}</p>{selected.lastSeparation?.finishedAt&&<p>{new Date(selected.lastSeparation.finishedAt).toLocaleString(en?'en-US':'zh-CN')}</p>}{selected.lastSeparation?.error&&<details><summary>{t('任务详情','Task details')}</summary><p>{selected.lastSeparation.error}</p></details>}<h3>{t('分离结果','Separation results')} · {resultClips.length}</h3><ul>{resultClips.map(({track,clip})=><li key={clip.id}><button className="history-result-clip" aria-pressed={selectedResult===clip.id} onClick={()=>setSelectedResult(clip.id)}><span title={clip.name} style={{borderLeftColor:track.color}}>{clip.name}</span><small>{formatTimecode(clipDuration(clip))}</small></button></li>)}</ul>{!resultClips.length&&<p>{t('暂无可用剪辑','No available clips')}</p>}<div className="history-inspector-actions"><button className="primary" onClick={()=>onOpen(selected)}>{t('继续试听','Open workspace')}</button><ExportDialog key={selected.id} project={selected} en={en} trackId={exportSelection?.track.id} clipId={exportSelection?.clip.id} beforeExport={async()=>{}}/></div></aside>}</div>
 </main><Dialog.Root open={!!deleting} onOpenChange={v=>{if(!v&&!busy)setDeleting(null)}}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content onEscapeKeyDown={preserveCompositionEscape} className="dialog"><Dialog.Title>{deleting?.archiveId?t('永久删除项目？','Permanently delete project?'):t('删除项目？','Delete project?')}</Dialog.Title><Dialog.Description>{deleting?.project.name} — {t('不会删除原始文件或已经导出的副本。','Original files and exported copies are not deleted.')}</Dialog.Description>
 {!deleting?.archiveId&&<label>{t('同时清理应用保存的音频','Also remove application audio assets')}<input type="checkbox" checked={purge} disabled={busy} onChange={e=>setPurge(e.target.checked)}/></label>}
 <p>{deleting?.archiveId||purge?t('项目及内部音频将永久删除，无法恢复。','The project and internal audio will be permanently deleted. This cannot be undone.'):t('保留的项目可在“已删除”中恢复。','Retained projects can be restored from Deleted.')}</p><p role="alert">{error}</p><div className="dialog-actions"><Dialog.Close disabled={busy}>{t('取消','Cancel')}</Dialog.Close><button disabled={busy} onClick={remove}>{busy?t('正在删除…','Deleting…'):t('删除','Delete')}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root></>
}
