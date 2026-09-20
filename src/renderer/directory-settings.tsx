import {useEffect,useState} from 'react'
import type {Settings} from '../shared/domain'
export function DirectorySettings({en,settings,onChange}:{en:boolean;settings:Settings;onChange:(settings:Settings)=>void}){
 const [folders,setFolders]=useState({modelDirectory:'',exportDirectory:''}),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const t=(zh:string,english:string)=>en?english:zh
 useEffect(()=>{let live=true;window.printemps.settingsDirectories().then(value=>{if(live)setFolders(value)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[settings.modelDirectory,settings.exportDirectory])
 async function choose(kind:'modelDirectory'|'exportDirectory',reset=false){setBusy(true);setError('');try{const result=reset?await window.printemps.resetSettingsDirectory(kind):await window.printemps.chooseSettingsDirectory(kind);if(result)onChange(result)}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <section className="directory-settings">{(['modelDirectory','exportDirectory'] as const).map(kind=><div className="directory-setting" key={kind}><strong>{kind==='modelDirectory'?t('模型缓存目录','Model cache folder'):t('默认导出目录','Default export folder')}</strong><p title={folders[kind]}>{folders[kind]||t('导出时选择','Choose when exporting')}</p><div className="dialog-actions"><button disabled={busy||!settings[kind]} onClick={()=>choose(kind,true)}>{t('恢复默认','Use default')}</button><button disabled={busy} onClick={()=>choose(kind)}>{t('更改','Change')}</button></div></div>)}<small>{t('更改目录不会迁移已有模型。','Existing models are not moved.')}</small>{error&&<p role="alert">{error}</p>}</section>
}
