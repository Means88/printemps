import {useMenuCommand} from './native-menu'
import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type {Project} from '../shared/domain'
import {trackClips,clipDuration} from '../shared/clips'
export function ExportDialog({project,en,trackId,clipId,menuOwner=false,beforeExport,disabled=false}:{project:Project;en:boolean;trackId?:string;clipId?:string;menuOwner?:boolean;disabled?:boolean;beforeExport:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[format,setFormat]=useState<'wav'|'flac'>('wav'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[directory,setDirectory]=useState('')
 const t=(a:string,b:string)=>en?b:a,track=project.tracks.find(t=>t.id===trackId),clip=track&&trackClips(track).find(c=>c.id===clipId&&!c.hidden)
 function show(){if(disabled||!clip)return;setMessage('');setDirectory('');setOpen(true)}
 useMenuCommand('export',()=>{if(menuOwner)show()})
 async function run(){if(!track||!clip)return;setBusy(true);setMessage('');try{await beforeExport();const result=await window.printemps.exportTracks(project.id,[track.id],format,[clip.id]);if(result){setDirectory(result.directory);setMessage(result.failure?result.failure.message:t('导出完成','Export complete'))}}catch(e){setMessage(t('导出失败：','Export failed: ')+String(e))}finally{setBusy(false)}}
 return <Dialog.Root open={open} onOpenChange={v=>{if(busy)return;if(v)show();else setOpen(false)}}><Dialog.Trigger disabled={disabled||!clip} className="secondary">{menuOwner?t('导出','Export'):t('导出剪辑','Export clip')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog"><Dialog.Title>{t('导出剪辑','Export clip')}</Dialog.Title><Dialog.Description>{clip?.name} · {clip?clipDuration(clip).toFixed(3):'—'} s</Dialog.Description><label>{t('格式','Format')}<select disabled={busy} value={format} onChange={e=>setFormat(e.target.value as 'wav'|'flac')}><option value="wav">WAV · 24-bit</option><option value="flac">FLAC · 24-bit</option></select></label><p role="status">{message}</p><div className="dialog-actions">{directory&&<button disabled={busy} onClick={()=>void window.printemps.openExportDirectory(directory).catch(e=>setMessage(String(e)))}>{t('打开文件夹','Open folder')}</button>}<Dialog.Close disabled={busy}>{t('关闭','Close')}</Dialog.Close><button className="primary" disabled={busy||!clip} onClick={run}>{busy?t('正在导出…','Exporting…'):t('导出','Export')}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}
