import {preserveCompositionEscape} from './keyboard'
import {useEffect,useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type {Settings} from '../shared/domain'
import type {DeviceProbe} from '../shared/api'

/** A ROCm build reaches AMD GPUs through the same torch.cuda API, so name whichever backend the probe found. */
function backendName(probe:DeviceProbe|null,unknown:string){return probe?.backend==='rocm'?'AMD ROCm':probe?.backend==='cuda'?'NVIDIA CUDA':unknown}
import {DirectorySettings} from './directory-settings'
import {UpdatePanel} from './update-panel'

export function Preferences({open,onOpenChange,en,settings,onChange}:{open:boolean;onOpenChange:(open:boolean)=>void;en:boolean;settings:Settings;onChange:(settings:Settings)=>void}){
 const [probe,setProbe]=useState<DeviceProbe|null>(null)
 const refreshProbe=()=>{window.printemps.probeDevice().then(setProbe).catch(()=>setProbe(null))}
 useEffect(()=>{if(!open)return;let live=true;window.printemps.probeDevice().then(result=>{if(live)setProbe(result)}).catch(()=>{});return ()=>{live=false}},[open])
 const [saving,setSaving]=useState(false),[error,setError]=useState('')
 const t=(zh:string,english:string)=>en?english:zh
 const gpuName=backendName(probe,'NVIDIA CUDA / AMD ROCm')
 async function save(value:Partial<Pick<Settings,'language'|'device'|'proxyMode'|'proxyUrl'|'hfEndpoint'>>){setSaving(true);setError('');try{onChange(await window.printemps.saveSettings(value))}catch(e){setError(String(e))}finally{setSaving(false)}}
 return <Dialog.Root open={open} onOpenChange={value=>{if(!saving){setError('');onOpenChange(value)}}}><Dialog.Portal><Dialog.Overlay className="overlay preferences-overlay"/><Dialog.Content onEscapeKeyDown={preserveCompositionEscape} className="preferences-page">
 <Dialog.Title>{t('按你的习惯工作','Work your way')}</Dialog.Title><Dialog.Description className="preferences-lead">{t('语言、处理设备、推理环境、网络与存储位置','Language, processing device, inference environment, network and storage')}</Dialog.Description>
 <div className="preferences-fields"><label className="preference-row"><span><strong>{t('界面语言','Interface language')}</strong><small>{t('即时切换界面语言，不影响文件名。','Switches the interface immediately; file names are unchanged.')}</small></span><select disabled={saving} value={settings.language} onChange={e=>void save({language:e.target.value as 'zh'|'en'})}><option value="zh">简体中文</option><option value="en">English</option></select></label>
 <label className="preference-row"><span><strong>{t('处理设备','Processing device')}</strong><small>{t('优先使用可用加速设备；不可用时使用 CPU。','Uses an available accelerator first and falls back to the CPU.')}{probe&&<><br/>{t(`本机可用：CPU${probe.cuda?' · '+gpuName:''}${probe.mps?' · Apple MPS（实验性，需手动选择）':''}`,`Available here: CPU${probe.cuda?' · '+gpuName:''}${probe.mps?' · Apple MPS (experimental, manual only)':''}`)}</>}</small></span><select disabled={saving} value={settings.device} onChange={e=>void save({device:e.target.value as Settings['device']})}><option value="auto">{probe?t(`自动选择（当前将使用 ${probe.auto==='cuda'?gpuName:'CPU'}）`,`Automatic (currently ${probe.auto==='cuda'?gpuName:'CPU'})`):t('自动选择','Automatic')}</option><option value="cpu">CPU</option><option value="cuda">{gpuName}</option><option value="mps">{t('Apple MPS（实验性）','Apple MPS (experimental)')}</option></select></label>
 <InterpreterRow en={en} settings={settings} probe={probe} onChange={value=>{onChange(value);refreshProbe()}}/>
 <EndpointRow en={en} settings={settings} saving={saving} onSave={save}/>
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

function InterpreterRow({en,settings,probe,onChange}:{en:boolean;settings:Settings;probe:DeviceProbe|null;onChange:(settings:Settings)=>void}){
 const t=(zh:string,english:string)=>en?english:zh
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const custom=!!settings.pythonPath
 async function pick(reset=false){setBusy(true);setError('');try{const result=reset?await window.printemps.resetPythonInterpreter():await window.printemps.choosePythonInterpreter();if(result)onChange(result)}catch(e){setError(String(e))}finally{setBusy(false)}}
 const status=()=>{
  if(!custom)return t('分离使用内置运行时。','Separation uses the bundled runtime.')
  if(!probe)return t('正在检查…','Checking…')
  if(probe.missing.length)return t(`缺少 ${probe.missing.join('、')}`,`Missing ${probe.missing.join(', ')}`)
  const name=backendName(probe,'GPU')
  return t(`torch ${probe.torch} · ${probe.cuda?name+' 可用':'未检测到 '+name}`,`torch ${probe.torch} · ${probe.cuda?name+' available':'no '+name+' detected'}`)
 }
 return <div className="preference-row proxy-row"><span><strong>{t('推理环境','Inference environment')}</strong><small>{t('默认使用内置运行时，仅 CPU。要用 NVIDIA CUDA 或 AMD ROCm，可指定自备的 Python 环境，只影响分离，分析仍用内置运行时。','The bundled runtime is CPU only. To use NVIDIA CUDA or AMD ROCm, point this at your own Python environment; it affects separation only, analysis keeps using the bundled runtime.')}</small></span>
 <div className="proxy-fields"><button className="directory-path" title={settings.pythonPath} disabled={busy} onClick={()=>pick()}>{settings.pythonPath||t('内置运行时','Bundled runtime')}<span aria-hidden="true">…</span></button>
 <small>{status()} <button type="button" className="link" onClick={()=>void window.printemps.openDocumentation('inference-environment').catch(e=>setError(String(e)))}>{t('查看配置说明','How to set this up')}</button></small>
 <div className="dialog-actions"><button disabled={busy||!custom} onClick={()=>pick(true)}>{t('恢复默认','Use default')}</button></div>
 {error&&<p role="alert">{error}</p>}</div></div>
}

const MIRROR='https://hf-mirror.com'
function EndpointRow({en,settings,saving,onSave}:{en:boolean;settings:Settings;saving:boolean;onSave:(value:Partial<Pick<Settings,'hfEndpoint'>>)=>Promise<void>}){
 const t=(zh:string,english:string)=>en?english:zh
 // The stored value cannot express "custom but not filled in yet", so the mode is local state.
 const derived=settings.hfEndpoint===''?'default':settings.hfEndpoint===MIRROR?'mirror':'custom'
 const [preset,setPreset]=useState(derived)
 useEffect(()=>{setPreset(derived)},[derived])
 const [address,setAddress]=useState(settings.hfEndpoint)
 useEffect(()=>{setAddress(settings.hfEndpoint)},[settings.hfEndpoint])
 const commit=()=>{if(address.trim()!==settings.hfEndpoint)void onSave({hfEndpoint:address})}
 return <div className="preference-row proxy-row"><span><strong>{t('模型下载源','Model download source')}</strong><small>{t('默认从 huggingface.co 下载。网络受限时可切换到镜像 hf-mirror.com，或填写自定义地址。','Weights come from huggingface.co by default. Switch to the hf-mirror.com mirror, or enter another host, if that one is unreachable.')}{preset==='custom'&&<><br/>{t('只填协议、主机和端口，例如 https://hf-mirror.com。','Scheme, host and port only, for example https://hf-mirror.com.')}</>}</small></span>
 <div className="proxy-fields"><select aria-label={t('模型下载源','Model download source')} disabled={saving} value={preset} onChange={e=>{const next=e.target.value as 'default'|'mirror'|'custom';setPreset(next);if(next==='default')void onSave({hfEndpoint:''});else if(next==='mirror')void onSave({hfEndpoint:MIRROR})}}>
 <option value="default">huggingface.co</option><option value="mirror">hf-mirror.com</option><option value="custom">{t('自定义','Custom')}</option></select>
 {preset==='custom'&&<input type="text" inputMode="url" autoComplete="off" spellCheck={false} aria-label={t('下载源地址','Download source address')} placeholder="https://hf-mirror.com" disabled={saving} value={address} onChange={e=>setAddress(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'){e.preventDefault();commit()}if(e.key==='Escape'){e.preventDefault();setAddress(settings.hfEndpoint)}}}/>}</div></div>
}
