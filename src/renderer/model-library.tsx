import {ErrorNotice} from './error-notice'
import {useEffect,useState} from 'react'
import {stemLabel,matchesStem,formatModelBytes} from '../shared/stems'
import * as Dialog from '@radix-ui/react-dialog'
export function ModelLibrary({en}:{en:boolean}){
 const [open,setOpen]=useState(false),[models,setModels]=useState<{id:string;bytes:number;cached:boolean}[]>([]),[query,setQuery]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState(0)
 const t=(a:string,b:string)=>en?b:a
 const refresh=async()=>setModels(await window.printemps.listModels())
 useEffect(()=>window.printemps?.onModelProgress(p=>setProgress(p.received/p.total)),[])
 async function action(id:string,remove:boolean){setBusy(id);setError('');setProgress(0);try{if(remove)await window.printemps.deleteModel(id);else await window.printemps.downloadModel(id);await refresh()}catch(e){setError(String(e))}finally{setBusy('')}}
 return <Dialog.Root open={open} onOpenChange={v=>{setOpen(v);if(v)refresh().catch(e=>setError(String(e)))}}><Dialog.Trigger>{t('模型管理','Models')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog history-dialog"><Dialog.Title>{t('模型管理','Model library')}</Dialog.Title><Dialog.Description>{t('按需下载声部模型；删除缓存不会删除项目结果。','Download models as needed. Removing a model preserves project results.')}</Dialog.Description><input aria-label={t('搜索模型','Search models')} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('搜索模型名称','Search model name')}/><ErrorNotice message={error} en={en} kind="download"/><div className="history-list">{models.filter(m=>matchesStem(m.id,query)).map(m=><div className="history-row" key={m.id}><div style={{flex:1}}><strong>{stemLabel(m.id,en)}</strong><small>{m.id}</small><small>{formatModelBytes(m.bytes)} · {m.cached?t('已缓存','Cached'):t('未下载','Not downloaded')}</small></div>{busy===m.id?<><progress value={progress} max={1}/><button onClick={()=>window.printemps.cancelModelDownload()}>{t('取消','Cancel')}</button></>:<button disabled={!!busy} onClick={()=>action(m.id,m.cached)}>{m.cached?t('删除','Remove'):t('下载','Download')}</button>}</div>)}</div><Dialog.Close>{t('关闭','Close')}</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
}
