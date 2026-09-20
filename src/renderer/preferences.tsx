import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type {Settings} from '../shared/domain'
import {DirectorySettings} from './directory-settings'
import {UpdatePanel} from './update-panel'

export function Preferences({open,onOpenChange,en,settings,onChange}:{open:boolean;onOpenChange:(open:boolean)=>void;en:boolean;settings:Settings;onChange:(settings:Settings)=>void}){
 const [saving,setSaving]=useState(false),[error,setError]=useState('')
 const t=(zh:string,english:string)=>en?english:zh
 async function save(value:Partial<Pick<Settings,'language'|'device'>>){setSaving(true);setError('');try{onChange(await window.printemps.saveSettings(value))}catch(e){setError(String(e))}finally{setSaving(false)}}
 return <Dialog.Root open={open} onOpenChange={value=>{if(!saving){setError('');onOpenChange(value)}}}><Dialog.Portal><Dialog.Overlay className="overlay preferences-overlay"/><Dialog.Content className="preferences-page">
 <Dialog.Title>{t('按你的习惯工作','Work your way')}</Dialog.Title><Dialog.Description className="sr-only">{t('语言、处理设备与存储位置','Language, processing device and storage locations')}</Dialog.Description>
 <div className="preferences-fields"><label className="preference-row"><span>{t('界面语言','Interface language')}</span><select disabled={saving} value={settings.language} onChange={e=>void save({language:e.target.value as 'zh'|'en'})}><option value="zh">简体中文</option><option value="en">English</option></select></label>
 <label className="preference-row"><span>{t('处理设备','Processing device')}</span><select disabled={saving} value={settings.device} onChange={e=>void save({device:e.target.value as Settings['device']})}><option value="auto">{t('自动（CUDA / CPU）','Automatic (CUDA / CPU)')}</option><option value="cpu">CPU</option><option value="cuda">NVIDIA CUDA</option><option value="mps">{t('Apple MPS（实验性）','Apple MPS (experimental)')}</option></select></label>
 <DirectorySettings en={en} settings={settings} onChange={onChange}/>
 {error&&<p role="alert">{error}</p>}<UpdatePanel en={en}/></div>
 <div className="dialog-actions preferences-actions"><Dialog.Close className="primary" disabled={saving}>{t('完成','Done')}</Dialog.Close></div>
 </Dialog.Content></Dialog.Portal></Dialog.Root>
}
