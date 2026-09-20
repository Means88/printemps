import {useMenuCommand} from './native-menu'
import { useEffect,useRef,useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { Project } from '../shared/domain'
export function ExportDialog({project,en,trackId,beforeExport,disabled=false}:{project:Project;en:boolean;trackId?:string;disabled?:boolean;beforeExport:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<string[]>([]),[format,setFormat]=useState<'wav'|'flac'>('wav'),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [exportDirectory,setExportDirectory]=useState('')
 const t=(a:string,b:string)=>en?b:a
 const latestProject=useRef(project);latestProject.current=project
 useMenuCommand('export',()=>{if(trackId||disabled||busy)return;setMessage('');setExportDirectory('');setSelected(project.tracks.filter(t=>t.role!=='original'&&!t.hidden).map(t=>t.id));setOpen(true)})
 const currentSelection=selected.filter(id=>project.tracks.some(track=>track.id===id))
 const replacedMessage=t('部分音轨已被分离结果替换，请重新确认要导出的音轨。','Some tracks were replaced by separation results. Review the tracks to export.')
 useEffect(()=>{
  if(open&&!busy&&currentSelection.length!==selected.length){setSelected(currentSelection);setMessage(current=>current?`${current}\n${replacedMessage}`:replacedMessage)}
 },[open,busy,project.tracks,selected])
 async function run(){
  setBusy(true);setMessage('')
  try{
   try{await beforeExport()}catch{setMessage(t('项目修改尚未保存。请关闭此窗口，重试保存后再导出。','Project changes have not been saved. Close this dialog, retry saving, then export.'));return}
   const current=selected.filter(id=>latestProject.current.tracks.some(track=>track.id===id))
   if(current.length!==selected.length){setSelected(current);setMessage(replacedMessage);return}
   const result=await window.printemps.exportTracks(project.id,selected,format)
   if(result&&result.count>0)setExportDirectory(result.directory)
   if(result?.failure){
    setSelected(result.failure.remainingIds)
    setMessage(t(`已导出 ${result.count} 条音轨至 ${result.directory}。「${result.failure.trackName}」导出失败，剩余音轨已选中。请检查磁盘空间和文件夹权限，或选择其它文件夹重试。`,`Exported ${result.count} tracks to ${result.directory}. “${result.failure.trackName}” failed. Remaining tracks are selected. Check free space and folder permissions, or retry in another folder.`)+'\n'+result.failure.message)
   }else if(result)setMessage(t(`已导出 ${result.count} 条音轨至 ${result.directory}`,`Exported ${result.count} tracks to ${result.directory}`))
  }catch(e){setMessage(t('导出失败，请检查目标文件夹后重试。','Export failed. Check the destination folder and retry.')+' '+String(e))}
  finally{setBusy(false)}
 }

 return <Dialog.Root open={open} onOpenChange={v=>{if(busy)return;setOpen(v);if(v){setMessage('');setExportDirectory('');setSelected(trackId?[trackId]:project.tracks.filter(t=>t.role!=='original'&&!t.hidden).map(t=>t.id))}}}><Dialog.Trigger disabled={disabled} className={trackId?'secondary':'primary'}>{trackId?t('导出此音轨','Export track'):t('导出音轨','Export')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog"><Dialog.Title>{t('导出音轨','Export tracks')}</Dialog.Title><Dialog.Description className="sr-only">{t('选择音轨和格式，随后选择目标文件夹。','Choose tracks and format, then a destination folder.')}</Dialog.Description><div className="export-list">{project.tracks.map(track=><label key={track.id}><span>{track.name}</span><input type="checkbox" checked={selected.includes(track.id)} disabled={busy} onChange={e=>setSelected(e.target.checked?[...selected,track.id]:selected.filter(id=>id!==track.id))}/></label>)}</div><label>{t('格式','Format')}<select disabled={busy} value={format} onChange={e=>setFormat(e.target.value as 'wav'|'flac')}><option value="wav">WAV · 24-bit</option><option value="flac">FLAC · 24-bit</option></select></label><p className="export-note">{t('导出原始音量','Exports use source gain')}</p><p role="status">{message}</p><div className="dialog-actions">{exportDirectory&&<button disabled={busy} onClick={()=>void window.printemps.openExportDirectory(exportDirectory).catch(e=>setMessage(t('无法打开文件夹，请检查目录是否仍然存在。','Could not open the folder. Check that it still exists.')+' '+String(e)))}>{t('打开文件夹','Open folder')}</button>}<Dialog.Close disabled={busy}>{t('关闭','Close')}</Dialog.Close><button className="primary" disabled={busy||!currentSelection.length} onClick={run}>{busy?t('正在导出…','Exporting…'):t('选择文件夹并导出','Choose folder & export')}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}
