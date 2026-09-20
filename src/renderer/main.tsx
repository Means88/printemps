import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {flushSync} from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
import {Fader} from './fader'
import { PlayIcon, PauseIcon, GearIcon, ArrowLeftIcon, Pencil1Icon } from '@radix-ui/react-icons'
import '@fontsource/nunito-sans/500.css'
import '@fontsource/inter/500.css'
import '@fontsource/noto-sans-sc/400.css'
import type { Project, Settings } from '../shared/domain'
import '../shared/api'
import './style.css'
import { ModelLibrary } from './model-library'
import { History } from './history'
import { ExportDialog } from './export-dialog'
import { AudioEngine } from './audio-engine'
import {ProjectSession,type SaveState} from './project-session'
import {TimelineControls} from './timeline-controls'
import type {LoopRange} from '../shared/playback'
import {DirectorySettings} from './directory-settings'
import {UpdatePanel} from './update-panel'
import { MusicControls } from './music-controls'
import {beatGrid,formatPosition,rulerTicks} from '../shared/timeline'
import { SeparationPanel } from './separation-panel'
function Name({value,onSave,en}:{value:string;onSave:(v:string)=>void;en:boolean}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(value),[invalid,setInvalid]=useState(false)
 const cancelled=useRef(false),errorId=React.useId()
 function save(){
  if(cancelled.current)return
  const name=draft.trim()
  if(!name){setInvalid(true);return}
  if(name!==value)onSave(name)
  setEditing(false);setInvalid(false)
 }
 return editing?<span className="name-editor" onClick={e=>e.stopPropagation()}><input className="name-input" aria-label={en?'Name':'名称'} aria-invalid={invalid} aria-describedby={invalid?errorId:undefined} autoFocus value={draft} maxLength={80} onChange={e=>{setDraft(e.target.value);setInvalid(false)}} onBlur={save} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter')save();if(e.key==='Escape'){cancelled.current=true;setEditing(false);setDraft(value);setInvalid(false)}}}/>{invalid&&<small id={errorId} role="alert">{en?'Enter a name.':'名称不能为空。'}</small>}</span>:<button className="name" onClick={e=>{e.stopPropagation();cancelled.current=false;setDraft(value);setInvalid(false);setEditing(true)}}><span className="name-label" title={value}>{value}</span><Pencil1Icon/></button>
}

function App(){
 const [projects,setProjects]=useState<Project[]>([]),[project,setProject]=useState<Project|null>(null),[settings,setSettings]=useState<Settings>({language:'zh',device:'auto',modelDirectory:'',exportDirectory:''}),[settingsOpen,setSettingsOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[playing,setPlaying]=useState(false),[time,setTime]=useState(0)
 const [historyOpen,setHistoryOpen]=useState(false)
 const [dragging,setDragging]=useState(false),[loadingAudio,setLoadingAudio]=useState(false)
 const [selectedTrack,setSelectedTrack]=useState(''),[zoom,setZoom]=useState(1),[loop,setLoop]=useState<LoopRange|null>(null)
 useEffect(()=>{setZoom(1);setLoop(null)},[project?.id])
 useEffect(()=>{if(project&&!project.tracks.some(track=>track.id===selectedTrack)){setSelectedTrack(project.tracks.find(track=>track.parentId===selectedTrack&&track.role==='other')?.id||project.tracks[0]?.id||'')}},[project?.id,project?.tracks,selectedTrack])
 const engine=useRef<AudioEngine|null>(null)
 const [saveState,setSaveState]=useState<SaveState>({pending:0,error:null})
 const [session]=useState(()=>new ProjectSession({read:id=>window.printemps.openProject(id),save:(id,edits)=>window.printemps.saveProject(id,edits)},setProject,setSaveState,(error,source)=>{if(source==='refresh')setError(error.message)}))
 const en=settings.language==='en',t=(zh:string,enText:string)=>en?enText:zh
 useEffect(()=>{document.documentElement.lang=settings.language==='en'?'en':'zh-CN'},[settings.language])
 useEffect(()=>{if(!window.printemps){setError('Open this application in Electron (npm run dev).');return}Promise.all([window.printemps.listProjects(),window.printemps.getSettings()]).then(([p,s])=>{setProjects(p);setSettings(s)}).catch(e=>setError(String(e)))},[])
 function update(next:Project){if(project)session.edit(project,next)}
 useEffect(()=>window.printemps?.onCloseRequest(async()=>{
  flushSync(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()})
  if(document.querySelector('[aria-invalid="true"],input:invalid'))throw new Error(document.documentElement.lang==='en'?'Please correct the highlighted value before closing.':'请先修正无效的输入内容，再关闭窗口。')
  // Blur commits inline editors synchronously; drain any saves queued during earlier saves as well.
  await session.flush()
 }),[])
 async function openProject(p:Project){try{await session.flush();session.open(await window.printemps.openProject(p.id));setHistoryOpen(false);setSelectedTrack('');setTime(0);setPlaying(false)}catch(e){if(e!==session.saveError)setError(String(e))}}
 async function importAudio(file?:File){if(busy)return;setBusy(true);try{const p=file?await window.printemps.importDroppedAudio(file):await window.printemps.importAudio();if(p){session.open(p);setTime(0);setPlaying(false);setProjects(await window.printemps.listProjects())}}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function goHome(){try{await session.flush();engine.current?.pause();setPlaying(false);session.open(null);setProjects(await window.printemps.listProjects())}catch(e){if(e!==session.saveError)setError(String(e))}}
 const original=project?.tracks.find(x=>x.role==='original')
 useEffect(()=>{const instance=new AudioEngine();engine.current=instance;return()=>{void instance.dispose()}},[])
 useEffect(()=>{if(!project){engine.current?.unload();return}let current=true;setLoadingAudio(true);engine.current?.load(project).then(()=>{if(current)setLoadingAudio(false)}).catch(e=>{if(current){setLoadingAudio(false);setError(String(e))}});return()=>{current=false}},[project?.id,project?.tracks.map(t=>t.id).join(',')])
 useEffect(()=>{if(project)engine.current?.applyMix(project)},[project])
 useEffect(()=>{let frame:number;const refresh=()=>{if(engine.current){setTime(Math.max(0,engine.current.position));setPlaying(engine.current.playing)}frame=requestAnimationFrame(refresh)};frame=requestAnimationFrame(refresh);return()=>cancelAnimationFrame(frame)},[])

 useEffect(()=>{
  if(!project)return
  const keydown=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement|null
   if(event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||busy||(loadingAudio&&!engine.current?.playing))return
   if(target?.closest('input,textarea,select,button,[contenteditable="true"],[role="slider"],[role="switch"],[role="menuitem"],[role="menu"]')||document.querySelector('[role="dialog"][data-state="open"]'))return
   const audio=engine.current;if(!audio)return
   if(event.code==='Space'){
    event.preventDefault()
    if(audio.playing)audio.pause();else void audio.play().catch(error=>setError(String(error)))
   }else if(event.key==='Home'){
    event.preventDefault();void audio.seek(0).catch(error=>setError(String(error)))
   }else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();void audio.seek(audio.position+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?10:1)).catch(error=>setError(String(error)))
   }
  }
  window.addEventListener('keydown',keydown)
  return()=>window.removeEventListener('keydown',keydown)
 },[project?.id,busy,loadingAudio])

 const format=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`
 return <><header><img src="./brand/wordmark.png" alt="Printemps"/><span>{project?.name||(historyOpen?t('全部项目','All projects'):t('新建项目','New project'))}</span><ModelLibrary en={en}/><button className="icon" aria-label={t('设置','Settings')} onClick={()=>setSettingsOpen(true)}><GearIcon/></button></header>
 {(error||saveState.error)&&<div role="alert" className="error">{error||saveState.error}{error&&<button onClick={()=>setError('')}>×</button>}</div>}
 {!project?(historyOpen?<History projects={projects} en={en} onOpen={openProject} onBack={()=>setHistoryOpen(false)} onRefresh={async()=>setProjects(await window.printemps.listProjects())}/>:<main className="home"><div className="eyebrow">A NEW SESSION</div><h1>{t('从一首歌，听见每个声部。','Hear every part of a song.')}</h1><p>{t('导入音频，在工作区选择需要的声部。','Import audio and choose the parts to separate in your workspace.')}</p><div className="home-columns"><button className={`dropzone ${dragging?'dragging':''}`} disabled={busy} onClick={()=>void importAudio()} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(busy)return;if(e.dataTransfer.files.length!==1){setError(t('每个项目只能导入一个音频文件。','Each project accepts exactly one audio file.'));return}void importAudio(e.dataTransfer.files[0])}}><span className="wave-symbol" aria-hidden="true"><svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M8 28v8M20 18v28M32 8v48M44 18v28M56 28v8"/></svg></span><h2>{busy?t('正在导入…','Importing…'):t('拖入或选择音频文件','Drop or choose an audio file')}</h2><span>WAV · FLAC · MP3 · M4A</span></button><section className="recent"><div className="recent-heading"><h2>{t('最近项目','Recent projects')}</h2><button onClick={()=>setHistoryOpen(true)}>{t('查看全部项目','All projects')}</button></div><input placeholder={t('搜索项目','Search projects')} value={search} onChange={e=>setSearch(e.target.value)}/>{projects.filter(p=>(p.name+' '+p.sourceName).toLowerCase().includes(search.toLowerCase())).map(p=><button className="project-row" key={p.id} onClick={()=>void openProject(p)}><strong>{p.name}</strong><small>{p.tracks.length} {t('音轨','tracks')} · {format(p.tracks[0]?.duration||0)}</small></button>)}{!projects.length&&<p>{t('还没有项目','No projects yet')}</p>}</section></div></main>):<main className="workspace"><div className="projectbar"><button className="icon" aria-label={t('返回首页','Home')} onClick={()=>void goHome()}><ArrowLeftIcon/></button><div><Name en={en} value={project.name} onSave={name=>update({...project,name})}/><small>{project.sourceName} · 44.1 kHz · Stereo</small></div><MusicControls key={project.id} project={project} en={en} time={time} onChange={update} onAnalyzed={session.refresh}/><ExportDialog project={project} en={en} beforeExport={session.flush}/></div><div className="timeline-tools"><span>{t('音轨','Tracks')} / {project.tracks.length.toString().padStart(2,'0')}</span><div className="segments" data-value={project.monitor} role="group" aria-label={t('试听来源','Monitoring source')}><button aria-pressed={project.monitor==='original'} className={project.monitor==='original'?'selected':''} onClick={()=>update({...project,monitor:'original'})}>{t('原始','Original')}</button><button aria-pressed={project.monitor==='stems'} disabled={project.tracks.length===1} className={project.monitor==='stems'?'selected':''} onClick={()=>update({...project,monitor:'stems'})}>{t('分轨','Stems')}</button></div><TimelineControls en={en} zoom={zoom} setZoom={setZoom} loop={loop} duration={original?.duration||0} time={time} setLoop={range=>{void engine.current?.setLoop(range).then(()=>setLoop(range)).catch(e=>setError(String(e)))}}/><label className="time-format"><select aria-label={t('时间显示格式','Time display format')} value={project.timeFormat} onChange={e=>update({...project,timeFormat:e.target.value as 'time'|'beats'})}><option value="time">{t('时分秒','Time')}</option><option value="beats" disabled={!project.music.bpm}>{t('小节与拍','Bars & beats')}</option></select></label></div><div className="track-area"><div className="timeline-content" style={{width:`${zoom*100}%`}}><div className="ruler"><span/><div className="ruler-scale">{rulerTicks(original?.duration||0,project.music,project.timeFormat,Math.min(100,Math.round(7*zoom))).map(tick=><span key={tick.seconds} style={{left:`${tick.seconds/Math.max(original?.duration||0,0.001)*100}%`,transform:tick.seconds>=(original?.duration||0)*0.98?'translateX(-100%)':undefined}}>{tick.label}</span>)}</div></div>{project.tracks.map(track=><React.Fragment key={track.id}><div className={`track ${selectedTrack===track.id?'track-selected':''}`} key={track.id} onClick={()=>setSelectedTrack(track.id)}><div className="track-head" style={{borderLeftColor:track.color}}><Name en={en} value={track.name} onSave={name=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,name}:x)})}/><small>{track.stem} · Stereo</small><div className="track-controls"><button onClick={()=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,solo:!x.solo}:x)})} className={track.solo?'solo':''}>S</button><button onClick={()=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,muted:!x.muted}:x)})} className={track.muted?'muted':''}>M</button><Fader value={track.gain} color={track.color} label={`${track.name} ${t('音量','volume')}`} onChange={gain=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,gain}:x)})}/></div></div><div className="wave" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const at=(e.clientX-rect.left)/rect.width*track.duration;void engine.current?.seek(at).catch(e=>setError(String(e)));setTime(at)}}><span>{track.name}</span>{loop&&<div className="loop-region" style={{left:`${loop.start/track.duration*100}%`,width:`${(loop.end-loop.start)/track.duration*100}%`}}/>}<svg viewBox={`0 0 ${track.peaks.length} 100`} preserveAspectRatio="none"><path d={track.peaks.map((v,i)=>`M${i},${50-v*44}v${v*88}`).join(' ')} stroke={track.color} strokeWidth="1"/></svg>{project.metronome&&beatGrid(track.duration,project.music).map(line=><i key={line.seconds} className={`beat-grid ${line.bar?'bar-line':''}`} style={{left:`${line.seconds/track.duration*100}%`}}/>)}<div className="playhead" style={{left:`${time/Math.max(track.duration,1)*100}%`}}/></div></div><div id={`task-after-${track.id}`}/></React.Fragment>)}<div id="task-after-original"/></div></div><SeparationPanel key={project.id} project={project} sourceId={selectedTrack} en={en} onComplete={session.refresh} beforeExport={session.flush}/><footer>{saveState.error?<button onClick={session.retry}>{t('重试保存','Retry save')}</button>:<span role="status">{saveState.pending?t('正在保存…','Saving…'):t('就绪','Ready')}</span>}<div className="transport" title={t('空格：播放/暂停 · ←/→：移动 1 秒 · Shift：移动 10 秒 · Home：返回起点','Space: play/pause · ←/→: seek 1 second · Shift: seek 10 seconds · Home: return to start')}><button onClick={()=>{void engine.current?.seek(0).catch(e=>setError(String(e)));setTime(0)}}>↤</button><button className="primary" aria-label={playing?'Pause':'Play'} onClick={async()=>{if(!engine.current||busy||(loadingAudio&&!engine.current?.playing))return;if(playing){engine.current.pause();setPlaying(false)}else{try{await engine.current.play();setPlaying(true)}catch(e){setError(String(e))}}}}>{playing?<PauseIcon/>:<PlayIcon/>}</button><strong>{formatPosition(time,project.music,project.timeFormat)}</strong><small>/ {format(original?.duration||0)}</small></div><div className="master"><span>{t('总音量','Master')}</span><Fader value={project.masterGain} max={0} label={t('总音量','Master volume')} onChange={masterGain=>update({...project,masterGain})}/></div></footer></main>}
 <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className="dialog settings-dialog"><Dialog.Title>{t('设置','Settings')}</Dialog.Title><Dialog.Description>{t('语言与处理设备','Language and processing device')}</Dialog.Description><label>{t('语言','Language')}<select value={settings.language} onChange={e=>{const s={...settings,language:e.target.value as 'zh'|'en'};setSettings(s);window.printemps.saveSettings({language:s.language,device:s.device}).then(setSettings).catch(e=>setError(String(e)))}}><option value="zh">简体中文</option><option value="en">English</option></select></label><label>{t('处理设备','Device')}<select value={settings.device} onChange={e=>{const s={...settings,device:e.target.value as Settings['device']};setSettings(s);window.printemps.saveSettings({language:s.language,device:s.device}).then(setSettings).catch(e=>setError(String(e)))}}><option value="auto">{t('自动（CUDA / CPU）','Automatic (CUDA / CPU)')}</option><option value="cpu">CPU</option><option value="cuda">NVIDIA CUDA</option><option value="mps">{t('Apple MPS（实验性）','Apple MPS (experimental)')}</option></select></label><DirectorySettings en={en} settings={settings} onChange={setSettings}/><UpdatePanel en={en}/><Dialog.Close className="primary">{t('完成','Done')}</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root></>
}
createRoot(document.getElementById('root')!).render(<App/>);
