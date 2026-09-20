import {preserveCompositionEscape} from './keyboard'
import {useEffect,useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type {Settings} from '../shared/domain'
import {DirectorySettings} from './directory-settings'
import {UpdatePanel} from './update-panel'

export function Preferences({open,onOpenChange,en,settings,onChange}:{open:boolean;onOpenChange:(open:boolean)=>void;en:boolean;settings:Settings;onChange:(settings:Settings)=>void}){
 const [probe,setProbe]=useState<{cuda:boolean;mps:boolean;auto:'cuda'|'cpu'}|null>(null)
 useEffect(()=>{if(!open)return;let live=true;window.printemps.probeDevice().then(result=>{if(live)setProbe(result)}).catch(()=>{});return ()=>{live=false}},[open])
 const [saving,setSaving]=useState(false),[error,setError]=useState('')
 const t=(zh:string,english:string)=>en?english:zh
 async function save(value:Partial<Pick<Settings,'language'|'device'|'proxyMode'|'proxyUrl'>>){setSaving(true);setError('');try{onChange(await window.printemps.saveSettings(value))}catch(e){setError(String(e))}finally{setSaving(false)}}
 return <Dialog.Root open={open} onOpenChange={value=>{if(!saving){setError('');onOpenChange(value)}}}><Dialog.Portal><Dialog.Overlay className="overlay preferences-overlay"/><Dialog.Content onEscapeKeyDown={preserveCompositionEscape} className="preferences-page">
 <Dialog.Title>{t('按你的习惯工作','Work your way')}</Dialog.Title><Dialog.Description className="preferences-lead">{t('语言、处理设备、网络代理与存储位置','Language, processing device, network proxy and storage locations')}</Dialog.Description>
 <div className="preferences-fields"><label className="preference-row"><span><strong>{t('界面语言','Interface language')}</strong><small>{t('即时切换界面语言，不影响文件名。','Switches the interface immediately; file names are unchanged.')}</small></span><select disabled={saving} value={settings.language} onChange={e=>void save({language:e.target.value as 'zh'|'en'})}><option value="zh">简体中文</option><option value="en">English</option></select></label>
 <label className="preference-row"><span><strong>{t('处理设备','Processing device')}</strong><small>{t('优先使用可用加速设备；不可用时使用 CPU。','Uses an available accelerator first and falls back to the CPU.')}{probe&&<><br/>{t(`本机可用：CPU${probe.cuda?' · NVIDIA CUDA':''}${probe.mps?' · Apple MPS（实验性，需手动选择）':''}`,`Available here: CPU${probe.cuda?' · NVIDIA CUDA':''}${probe.mps?' · Apple MPS (experimental, manual only)':''}`)}</>}</small></span><select disabled={saving} value={settings.device} onChange={e=>void save({device:e.target.value as Settings['device']})}><option value="auto">{probe?t(`自动选择（当前将使用 ${probe.auto==='cuda'?'NVIDIA CUDA':'CPU'}）`,`Automatic (currently ${probe.auto==='cuda'?'NVIDIA CUDA':'CPU'})`):t('自动选择','Automatic')}</option><option value="cpu">CPU</option><option value="cuda">NVIDIA CUDA</option><option value="mps">{t('Apple MPS（实验性）','Apple MPS (experimental)')}</option></select></label>
 <ProxyRow en={en} settings={settings} saving={saving} onSave={save}/>
 <DirectorySettings en={en} settings={settings} onChange={onChange}/>
 {error&&<p role="alert">{error}</p>}<UpdatePanel en={en}/></div>
 <div className="dialog-actions preferences-actions"><Dialog.Close className="primary" disabled={saving}>{t('完成','Done')}</Dialog.Close></div>
 </Dialog.Content></Dialog.Portal></Dialog.Root>
}

function ProxyRow({en,settings,saving,onSave}:{en:boolean;settings:Settings;saving:boolean;onSave:(value:Partial<Pick<Settings,'proxyMode'|'proxyUrl'>>)=>Promise<void>}){
 const t=(zh:string,english:string)=>en?english:zh
 const [address,setAddress]=useState(settings.proxyUrl)
 useEffect(()=>{setAddress(settings.proxyUrl)},[settings.proxyUrl])
 const manual=settings.proxyMode==='manual'
 const commit=()=>{if(address.trim()!==settings.proxyUrl)void onSave({proxyUrl:address})}
 return <div className="preference-row proxy-row"><span><strong>{t('网络代理','Network proxy')}</strong><small>{t('下载模型时使用。','Used when downloading models.')}{manual&&<><br/>{t('支持 http、https、socks5，可带用户名和密码，例如 http://127.0.0.1:7890。','http, https or socks5, optionally with a user name and password, e.g. http://127.0.0.1:7890.')}</>}</small></span>
 <div className="proxy-fields"><select aria-label={t('网络代理','Network proxy')} disabled={saving} value={settings.proxyMode} onChange={e=>void onSave({proxyMode:e.target.value as Settings['proxyMode']})}><option value="system">{t('跟随系统','Follow the system')}</option><option value="direct">{t('不使用代理','No proxy')}</option><option value="manual">{t('自定义','Custom')}</option></select>
 {manual&&<input type="text" inputMode="url" autoComplete="off" spellCheck={false} aria-label={t('代理地址','Proxy address')} placeholder="http://127.0.0.1:7890" disabled={saving} value={address} onChange={e=>setAddress(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'){e.preventDefault();commit()}if(e.key==='Escape'){e.preventDefault();setAddress(settings.proxyUrl)}}}/>}</div></div>
}
