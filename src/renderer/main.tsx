import {SaveRecovery} from './save-recovery'
import {matchesProject} from '../shared/project-search'
import {isCompositionKey} from './keyboard'
import {formatTimecode} from '../shared/timecode'
import {ClipLane} from './clip-lane'
import {trackClips,timelineDuration,type ClipAction} from '../shared/clips'
import {useMenuCommand} from './native-menu'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {flushSync} from 'react-dom'
import * as Switch from '@radix-ui/react-switch'
import {Fader} from './fader'
import { PlayIcon, PauseIcon, ChevronRightIcon, ArrowLeftIcon, Pencil1Icon, TrackPreviousIcon, MixerHorizontalIcon, ViewVerticalIcon } from '@radix-ui/react-icons'
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
import {TrackManager} from './track-manager'
import {Shortcuts,acceptsShortcut} from './shortcuts'
import {TimelineControls,LoopControls} from './timeline-controls'
import type {LoopRange} from '../shared/playback'
import {Preferences} from './preferences'
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
 return editing?<span className="name-editor" onClick={e=>e.stopPropagation()}><input className="name-input" aria-label={en?'Name':'名称'} aria-invalid={invalid} aria-describedby={invalid?errorId:undefined} autoFocus value={draft} maxLength={80} onChange={e=>{setDraft(e.target.value);setInvalid(false)}} onBlur={save} onKeyDown={e=>{if(isCompositionKey(e.nativeEvent))return;if(e.key==='Enter')save();if(e.key==='Escape'){cancelled.current=true;setEditing(false);setDraft(value);setInvalid(false)}}}/>{invalid&&<small id={errorId} role="alert">{en?'Enter a name.':'名称不能为空。'}</small>}</span>:<button className="name" onClick={e=>{e.stopPropagation();cancelled.current=false;setDraft(value);setInvalid(false);setEditing(true)}}><span className="name-label" title={value}>{value}</span><Pencil1Icon/></button>
}

function App(){
 const [separationBusy,setSeparationBusy]=useState(false)
 const [projects,setProjects]=useState<Project[]>([]),[project,setProject]=useState<Project|null>(null),[settings,setSettings]=useState<Settings>({language:'zh',device:'auto',modelDirectory:'',exportDirectory:''}),[settingsOpen,setSettingsOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[playing,setPlaying]=useState(false),[time,setTime]=useState(0)
 const [historyOpen,setHistoryOpen]=useState(false),[modelsOpen,setModelsOpen]=useState(false)
 const [dragging,setDragging]=useState(false),[loadingAudio,setLoadingAudio]=useState(false)
 const [inspectorCollapsed,setInspectorCollapsed]=useState(false)
 const [tracksOpen,setTracksOpen]=useState(false),[shortcutsOpen,setShortcutsOpen]=useState(false),[marks,setMarks]=useState<LoopRange|null>(null)
 const trackArea=useRef<HTMLDivElement>(null)
 const [selectedClipId,setSelectedClipId]=useState('')
 const [selectedTrack,setSelectedTrack]=useState(''),[zoom,setZoom]=useState(1),[loop,setLoop]=useState<LoopRange|null>(null)
 useEffect(()=>{setZoom(1);setLoop(null);setMarks(null)},[project?.id])
 useEffect(()=>{if(project&&!project.tracks.some(track=>track.id===selectedTrack&&!track.hidden)){setSelectedTrack(project.tracks.find(track=>track.parentId===selectedTrack&&track.role==='other')?.id||project.tracks.find(track=>!track.hidden)?.id||'')}},[project?.id,project?.tracks,selectedTrack])
 useEffect(()=>{const track=project?.tracks.find(t=>t.id===selectedTrack);if(track&&!trackClips(track).some(c=>c.id===selectedClipId&&!c.hidden))setSelectedClipId(trackClips(track).find(c=>!c.hidden)?.id||'')},[project,selectedTrack,selectedClipId])
 const engine=useRef<AudioEngine|null>(null)
 const [saveState,setSaveState]=useState<SaveState>({pending:0,error:null})
 const [session]=useState(()=>new ProjectSession({read:id=>window.printemps.openProject(id),save:(id,edits)=>window.printemps.saveProject(id,edits)},setProject,setSaveState,(error,source)=>{if(source==='refresh')setError(error.message)}))
 const en=settings.language==='en',t=(zh:string,enText:string)=>en?enText:zh
 const recentProjects=projects.filter(p=>matchesProject(p,search)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3)
 useEffect(()=>{document.documentElement.lang=settings.language==='en'?'en':'zh-CN'},[settings.language])
 useEffect(()=>{if(!window.printemps){setError('Open this application in Electron (pnpm run dev).');return}Promise.all([window.printemps.listProjects(),window.printemps.getSettings()]).then(([p,s])=>{setProjects(p);setSettings(s)}).catch(e=>setError(String(e)))},[])
 useEffect(()=>{
  let mounted=true,revision=0,lastTask='',completed=0
  const unsubscribe=window.printemps?.onSeparation(task=>{
   const count=task.completedStems||0
   const refresh=task.id!==lastTask||count!==completed||['complete','failed','cancelled'].includes(task.phase)
   lastTask=task.id;completed=count
   if(!refresh)return
   const request=++revision
   void window.printemps.listProjects().then(items=>{if(mounted&&request===revision)setProjects(items)}).catch(e=>{if(mounted&&request===revision)setError(String(e))})
  })
  return()=>{mounted=false;unsubscribe?.()}
 },[])
 async function editClip(action:ClipAction){if(!project||separationBusy||busy||session.saveError)return;const source=project.tracks.find(t=>t.id===action.trackId);if(!source||(project.monitor==='original')!==(source.role==='original'))return;setBusy(true);try{session.mutate(project.id,()=>window.printemps.editClip(project.id,action));await session.flush()}catch(e){if(e!==session.saveError)setError(String(e))}finally{setBusy(false)}}
 function splitClip(){const track=project?.tracks.find(t=>t.id===selectedTrack),clip=track&&trackClips(track).find(c=>c.id===selectedClipId);if(track&&clip)void editClip({kind:'split',trackId:track.id,clipId:clip.id,expected:clip,at:engine.current?.position||0})}
 function update(next:Project){if(project)session.edit(project,next)}
 useEffect(()=>window.printemps?.onCloseRequest(async()=>{
  flushSync(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()})
  if(document.querySelector('[aria-invalid="true"],input:invalid'))throw new Error(document.documentElement.lang==='en'?'Please correct the highlighted value before closing.':'请先修正无效的输入内容，再关闭窗口。')
  // Blur commits inline editors synchronously; drain any saves queued during earlier saves as well.
  await session.flush()
 }),[])
 async function openProject(p:Project){try{await session.flush();session.open(await window.printemps.openProject(p.id));setHistoryOpen(false);setSelectedTrack('');setTime(0);setPlaying(false)}catch(e){if(e!==session.saveError)setError(String(e))}}
 async function importAudio(file?:File){if(busy)return;setBusy(true);try{await session.flush();const p=file?await window.printemps.importDroppedAudio(file):await window.printemps.importAudio();if(p){session.open(p);setTime(0);setPlaying(false);setProjects(await window.printemps.listProjects())}}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function goHome(){try{await session.flush();engine.current?.pause();setPlaying(false);session.open(null);setProjects(await window.printemps.listProjects())}catch(e){if(e!==session.saveError)setError(String(e))}}
 const selectedTrackData=project?.tracks.find(t=>t.id===selectedTrack)
 const selectedClipData=selectedTrackData&&trackClips(selectedTrackData).find(c=>c.id===selectedClipId&&!c.hidden)
 const clipActive=!!selectedClipData&&!!selectedTrackData&&(project?.monitor==='original')===(selectedTrackData.role==='original')
 const canSplit=clipActive&&!separationBusy&&!busy&&!saveState.error&&time>selectedClipData!.offset&&time<selectedClipData!.offset+selectedClipData!.end-selectedClipData!.start
 const projectDuration=project?timelineDuration(project):0
 const original=project?.tracks.find(x=>x.role==='original')
 useEffect(()=>{const instance=new AudioEngine();engine.current=instance;return()=>{void instance.dispose()}},[])
 useEffect(()=>{if(!project){engine.current?.unload();return}let current=true;setLoadingAudio(true);engine.current?.load(project).then(()=>{if(current)setLoadingAudio(false)}).catch(e=>{if(current){setLoadingAudio(false);setError(String(e))}});return()=>{current=false}},[project?.id,JSON.stringify(project?.tracks.map(t=>[t.id,t.clips]))])
 useEffect(()=>{if(project)engine.current?.applyMix(project)},[project])
 useEffect(()=>{let frame:number;const refresh=()=>{if(engine.current){setTime(Math.max(0,engine.current.position));setPlaying(engine.current.playing)}frame=requestAnimationFrame(refresh)};frame=requestAnimationFrame(refresh);return()=>cancelAnimationFrame(frame)},[])

 function applyLoop(range:LoopRange|null){void engine.current?.setLoop(range).then(()=>setLoop(range)).catch(e=>setError(String(e)))}
 function toggleLoop(){const duration=projectDuration;if(duration<.01)return;applyLoop(loop?null:marks??{start:0,end:duration})}
 function markLoop(side:'start'|'end'){
  const duration=projectDuration;if(duration<.01)return
  const at=Math.max(0,Math.min(engine.current?.position||0,duration)),range={...(marks??loop??{start:0,end:duration}),[side]:at}
  if(range.end-range.start<.01){if(side==='start'){range.start=Math.min(at,duration-.01);range.end=duration}else{range.start=0;range.end=Math.max(.01,at)}}
  setMarks(range);if(loop)applyLoop(range)
 }
 useEffect(()=>window.printemps.onMenuCommand(command=>window.dispatchEvent(new CustomEvent('printemps:menu',{detail:command}))),[])
 useEffect(()=>{
  let previous=''
  const sync=()=>{const source=project?.tracks.find(t=>t.id===selectedTrack);const state={language:settings.language,project:!!project,blocked:busy||loadingAudio||!!document.querySelector('[role="dialog"][data-state="open"]'),playing,loop:!!loop,metronome:!!project?.metronome,hasBpm:!!project?.music.bpm,canSplit,canExport:clipActive,canSeparate:clipActive&&!separationBusy&&!!source&&!source.hidden&&((project?.monitor==='original')===(source.role==='original')),inspector:!inspectorCollapsed};const key=JSON.stringify(state);if(key!==previous){previous=key;void window.printemps.syncMenu(state).catch(()=>{})}}
  sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state']});return()=>observer.disconnect()
 },[project,settings.language,busy,loadingAudio,playing,loop,selectedTrack,inspectorCollapsed,separationBusy,canSplit,clipActive])
 useMenuCommand('split',()=>{if(canSplit)splitClip()})
 useMenuCommand('import',()=>{if(!busy)void importAudio()})
 useMenuCommand('history',()=>{void goHome().then(()=>setHistoryOpen(true))})
 useMenuCommand('settings',()=>setSettingsOpen(true))
 useMenuCommand('shortcuts',()=>setShortcutsOpen(true))
 useMenuCommand('tracks',()=>{if(project)setTracksOpen(true)})
 useMenuCommand('inspector',()=>{if(project)setInspectorCollapsed(v=>!v)})
 useMenuCommand('play',()=>{if(!project||busy||loadingAudio)return;const a=engine.current;if(a?.playing)a.pause();else void a?.play().catch(e=>setError(String(e)))})
 useMenuCommand('start',()=>{if(project)void engine.current?.seek(0).catch(e=>setError(String(e)))})
 useMenuCommand('loop',()=>{if(project)toggleLoop()})
 useMenuCommand('in',()=>{if(project)markLoop('start')})
 useMenuCommand('out',()=>{if(project)markLoop('end')})
 useMenuCommand('metronome',()=>{if(project?.music.bpm)update({...project,metronome:!project.metronome})})
 useMenuCommand('zoomIn',()=>{if(project)setZoom(z=>Math.min(16,z*1.5))})
 useMenuCommand('zoomOut',()=>{if(project)setZoom(z=>Math.max(1,z/1.5))})
 useMenuCommand('fit',()=>{if(project)setZoom(1)})
 useEffect(()=>{
  if(!project)return
  const keydown=(event:KeyboardEvent)=>{
   if(!acceptsShortcut(event,!!document.querySelector('[role="dialog"][data-state="open"]'))||busy)return
   const audio=engine.current;if(!audio)return
   const key=event.key.toLowerCase()
   if(event.code==='Space'){
    event.preventDefault();if(audio.playing)audio.pause();else if(!loadingAudio)void audio.play().catch(e=>setError(String(e)))
   }else if(event.key==='Home'){event.preventDefault();void audio.seek(0).catch(e=>setError(String(e)))}
   else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();void audio.seek(audio.position+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?10:1)).catch(e=>setError(String(e)))}
   else if(key==='l'){event.preventDefault();toggleLoop()}
   else if(key==='i'||key==='o'){event.preventDefault();markLoop(key==='i'?'start':'end')}
   else if(key==='+'||key==='='||key==='-'){event.preventDefault();setZoom(z=>Math.max(1,Math.min(16,z*(key==='-'?1/1.5:1.5))))}
   else if(key==='0'){event.preventDefault();setZoom(1)}
   else if(key==='s'){event.preventDefault();if(canSplit)splitClip()}
   else if(key==='t'){event.preventDefault();setTracksOpen(true)}
   else if(key==='?'){event.preventDefault();setShortcutsOpen(true)}
  }
  window.addEventListener('keydown',keydown)
  return()=>window.removeEventListener('keydown',keydown)
 },[project,loop,marks,busy,loadingAudio,selectedTrack,selectedClipId,separationBusy,canSplit])
 useEffect(()=>{
  const area=trackArea.current;if(!area)return
  const wheel=(event:WheelEvent)=>{
   if(!event.ctrlKey&&Math.abs(event.deltaX)>Math.abs(event.deltaY))return
   if((event.target as HTMLElement).closest('.track-head'))return
   event.preventDefault()
   const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?area.clientHeight:1)
   const x=Math.max(244,event.clientX-area.getBoundingClientRect().left),oldWidth=area.scrollWidth-244
   const anchor=(area.scrollLeft+x-244)/Math.max(1,oldWidth)
   flushSync(()=>setZoom(z=>Math.max(1,Math.min(16,z*Math.exp(-delta*(event.ctrlKey?.01:.003))))))
   area.scrollLeft=anchor*(area.scrollWidth-244)-(x-244)
  }
  area.addEventListener('wheel',wheel,{passive:false});return()=>area.removeEventListener('wheel',wheel)
 },[project?.id])

 const format=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`
 return <><header className="titlebar" data-page={settingsOpen?'settings':modelsOpen?'models':project?'workspace':historyOpen?'history':'home'} data-platform={window.printemps?.platform||'browser'}><img src="./brand/wordmark.png" alt="Printemps"/><span>{settingsOpen?t('设置','Settings'):modelsOpen?t('模型管理','Model library'):project?.name||(historyOpen?t('全部项目','All projects'):t('新建项目','New project'))}</span>{!project&&<div className="app-tools"><ModelLibrary en={en} onOpenChange={setModelsOpen} onSettingsChange={setSettings}/><button className="icon" aria-label={t('设置','Settings')} title={t('设置','Settings')} onClick={()=>setSettingsOpen(true)}><MixerHorizontalIcon/></button><Shortcuts en={en} open={shortcutsOpen} setOpen={setShortcutsOpen}/></div>}</header>
 {error&&<div role="alert" className="error">{error}<button onClick={()=>setError('')}>×</button></div>}
 {saveState.error&&<SaveRecovery message={saveState.error} en={en} onRetry={session.retry}/>}
 {!project?(historyOpen?<History projects={projects} en={en} onOpen={openProject} onBack={()=>setHistoryOpen(false)} onRefresh={async()=>setProjects(await window.printemps.listProjects())}/>:<main className="home"><div className="eyebrow">A NEW SESSION</div><h1>{t('从一首歌，听见每个声部。','Hear every part of a song.')}</h1><div className="home-columns"><button aria-label={t('选择音频文件','Choose audio file')} className={`dropzone ${dragging?'dragging':''}`} disabled={busy} onClick={()=>void importAudio()} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(busy)return;if(e.dataTransfer.files.length!==1){setError(t('每个项目只能导入一个音频文件。','Each project accepts exactly one audio file.'));return}void importAudio(e.dataTransfer.files[0])}}><span className="wave-symbol" aria-hidden="true"><svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M8 28v8M20 18v28M32 8v48M44 18v28M56 28v8"/></svg></span><h2>{busy?t('正在导入…','Importing…'):t('将音频拖放到这里','Drop audio here')}</h2><span className="audio-formats">WAV · FLAC · MP3 · M4A</span><span className="dropzone-action" aria-hidden="true">{busy?t('正在导入…','Importing…'):t('选择音频文件','Choose audio file')}</span></button><section className="recent"><div className="recent-heading"><h2>{t('最近项目','Recent projects')}</h2><button onClick={()=>setHistoryOpen(true)}>{t('查看全部项目','All projects')}</button></div><input aria-label={t('搜索项目','Search projects')} placeholder={t('搜索项目','Search projects')} value={search} onChange={e=>setSearch(e.target.value)}/>{recentProjects.map(p=><button className="project-row" key={p.id} onClick={()=>void openProject(p)}><svg className="recent-wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 10v4M7 6v12M12 3v18M17 7v10M21 10v4"/></svg><span className="project-row-copy"><strong>{p.name}</strong><small>{p.tracks.length} {t('音轨','tracks')} · {format(p.tracks[0]?.duration||0)}</small></span><ChevronRightIcon aria-hidden="true"/></button>)}{!recentProjects.length&&<p>{search.trim()?t('没有匹配项目，请尝试其它关键词。','No matching projects. Try another search.'):t('还没有项目','No projects yet')}</p>}</section></div></main>):<main className="workspace"><div className="projectbar"><button className="icon" aria-label={t('返回首页','Home')} onClick={()=>void goHome()}><ArrowLeftIcon/></button><div><Name en={en} value={project.name} onSave={name=>update({...project,name})}/><small>{project.sourceName} · 44.1 kHz · Stereo</small></div><MusicControls key={project.id} project={project} en={en} time={time} onChange={update} onAnalyzed={session.refresh}/><ExportDialog project={project} en={en} trackId={selectedTrack} clipId={selectedClipId} disabled={!clipActive||busy} menuOwner beforeExport={session.flush}/><div className="app-tools"><Shortcuts en={en} open={shortcutsOpen} setOpen={setShortcutsOpen}/><ModelLibrary en={en} onOpenChange={setModelsOpen} onSettingsChange={setSettings}/><button className="icon" aria-label={t('设置','Settings')} title={t('设置','Settings')} onClick={()=>setSettingsOpen(true)}><MixerHorizontalIcon/></button><button className="icon" aria-expanded={!inspectorCollapsed} aria-label={inspectorCollapsed?t('展开剪辑详情','Expand clip details'):t('收起剪辑详情','Collapse clip details')} onClick={()=>setInspectorCollapsed(!inspectorCollapsed)}><ViewVerticalIcon/></button></div></div><div className="timeline-tools"><div className="track-list-tools"><span>{t('音轨','Tracks')} / {String(project.tracks.filter(track=>!track.hidden).length).padStart(2,'0')}</span><TrackManager project={project} en={en} open={tracksOpen} onOpenChange={setTracksOpen} onChange={update} beforeEdit={session.flush} onComplete={session.refresh}/></div><div className="segments" data-value={project.monitor} role="group" aria-label={t('试听来源','Monitoring source')}><button aria-pressed={project.monitor==='original'} className={project.monitor==='original'?'selected':''} onClick={()=>update({...project,monitor:'original'})}>{t('原始','Original')}</button><button aria-pressed={project.monitor==='stems'} disabled={project.tracks.length===1} className={project.monitor==='stems'?'selected':''} onClick={()=>update({...project,monitor:'stems'})}>{t('分轨','Stems')}</button></div><label className="time-format"><select aria-label={t('时间显示格式','Time display format')} value={project.timeFormat} onChange={e=>update({...project,timeFormat:e.target.value as 'time'|'beats'})}><option value="time">{t('时分秒','Time')}</option><option value="beats" disabled={!project.music.bpm}>{t('小节与拍','Bars & beats')}</option></select></label><label className="timeline-metronome">{t('节拍器','Metronome')}<Switch.Root className="switch" checked={project.metronome} disabled={!project.music.bpm} aria-label={t('节拍器','Metronome')} onCheckedChange={metronome=>update({...project,metronome})}><Switch.Thumb className="switch-thumb"/></Switch.Root></label><button disabled={!canSplit} onClick={splitClip}>{t('分割','Split')} <kbd>S</kbd></button><TimelineControls en={en} zoom={zoom} setZoom={setZoom}/></div><div className="track-area" ref={trackArea}><div className="timeline-content" style={{width:`${zoom*100}%`}}><div className="ruler"><span/><div className="ruler-scale">{rulerTicks(projectDuration,project.music,project.timeFormat,Math.min(100,Math.round(7*zoom))).map(tick=><span key={tick.seconds} style={{left:`${tick.seconds/Math.max(projectDuration,0.001)*100}%`,transform:tick.seconds>=(projectDuration)*0.98?'translateX(-100%)':undefined}}>{tick.label}</span>)}{marks&&(['start','end'] as const).map(side=><i key={side} className={`range-marker ${side}`} title={`${side==='start'?'I':'O'} ${marks[side].toFixed(3)} s`} style={{left:`${marks[side]/Math.max(projectDuration,1)*100}%`}}>{side==='start'?'I':'O'}</i>)}</div></div>{project.metronome&&<div className="track metronome-track"><div className="track-head"><strong>{t('节拍器','Metronome')}</strong><small>{project.music.bpm??'—'} BPM · {project.music.meter}</small><div className="track-controls"><Fader value={project.clickGain} max={0} label={t('节拍器音量','Metronome volume')} onChange={clickGain=>update({...project,clickGain})}/></div></div><div className="wave click-wave">{beatGrid(projectDuration,project.music).map(line=><i key={line.seconds} className={`click-mark ${line.bar?'downbeat':''}`} style={{left:`${line.seconds/Math.max(projectDuration,1)*100}%`}}/>)}<div className="playhead" style={{left:`${time/Math.max(projectDuration,1)*100}%`}}/></div></div>}{project.tracks.filter(track=>!track.hidden).map(track=><React.Fragment key={track.id}><div className={`track ${selectedTrack===track.id?'track-selected':''} ${track.muted?'track-muted':''} ${(project.monitor==='original')!==(track.role==='original')?'track-inactive':''}`} key={track.id} onClick={()=>setSelectedTrack(track.id)}><fieldset disabled={(project.monitor==='original')!==(track.role==='original')} className="track-head" style={{borderLeftColor:track.role==='other'?'#4dd6ba':track.color}}><Name en={en} value={track.name} onSave={name=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,name}:x)})}/><small>{track.stem} · Stereo</small><div className="track-controls"><button aria-label={`${track.name} ${t('独奏','solo')}`} title={t('独奏：仅试听开启独奏的音轨','Solo: listen only to soloed tracks')} aria-pressed={track.solo} onClick={()=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,solo:!x.solo}:x)})} className={track.solo?'solo':''}>S</button><button aria-label={`${track.name} ${t('静音','mute')}`} title={t('静音：停止此音轨发声','Mute: silence this track')} aria-pressed={track.muted} onClick={()=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,muted:!x.muted}:x)})} className={track.muted?'muted':''}>M</button><Fader disabled={(project.monitor==='original')!==(track.role==='original')} value={track.gain} color={track.role==='other'?'#4dd6ba':track.color} label={`${track.name} ${t('音量','volume')}`} onChange={gain=>update({...project,tracks:project.tracks.map(x=>x.id===track.id?{...x,gain}:x)})}/></div></fieldset><div className="wave multi-clip-wave"><ClipLane track={track} duration={Math.max(projectDuration,.001)} selected={selectedTrack===track.id?selectedClipId:''} disabled={busy||!!saveState.error||separationBusy||(project.monitor==='original')!==(track.role==='original')} en={en} onSelect={id=>{setSelectedTrack(track.id);setSelectedClipId(id)}} onEdit={editClip} onSeek={at=>{void engine.current?.seek(at).catch(e=>setError(String(e)));setTime(at)}}/>{project.metronome&&beatGrid(projectDuration,project.music).map(line=><i key={line.seconds} className={`beat-grid ${line.bar?'bar-line':''}`} style={{left:`${line.seconds/Math.max(projectDuration,1)*100}%`}}/>)}{loop&&<div className="loop-region" style={{left:`${loop.start/projectDuration*100}%`,width:`${(loop.end-loop.start)/projectDuration*100}%`}}/>}<div className="playhead" style={{left:`${time/Math.max(projectDuration,1)*100}%`}}/></div></div><div id={`task-after-${track.id}`}/></React.Fragment>)}<div id="task-after-original"/></div></div><SeparationPanel editingBlocked={busy||!!saveState.error} clipId={selectedClipId} onEditClip={editClip} onBusyChange={setSeparationBusy} collapsed={inspectorCollapsed} key={project.id} project={project} sourceId={selectedTrack} en={en} onComplete={session.refresh} beforeExport={session.flush}/><footer><div className="save-status">{!saveState.error&&<span role="status">{saveState.pending?t('正在保存…','Saving…'):''}</span>}</div><div className="transport" title={t('空格：播放/暂停 · ←/→：移动 1 秒 · Shift：移动 10 秒 · Home：返回起点','Space: play/pause · ←/→: seek 1 second · Shift: seek 10 seconds · Home: return to start')}><button aria-label={t('返回起点','Return to start')} title={t('返回起点','Return to start')} onClick={()=>{void engine.current?.seek(0).catch(e=>setError(String(e)));setTime(0)}}><TrackPreviousIcon/></button><button className="primary" aria-label={playing?t('暂停','Pause'):t('播放','Play')} onClick={async()=>{if(!engine.current||busy||(loadingAudio&&!engine.current?.playing))return;if(playing){engine.current.pause();setPlaying(false)}else{try{await engine.current.play();setPlaying(true)}catch(e){setError(String(e))}}}}>{playing?<PauseIcon/>:<PlayIcon/>}</button><LoopControls en={en} enabled={!!loop} toggle={toggleLoop} mark={markLoop}/><strong>{project.timeFormat==='time'?formatTimecode(time):formatPosition(time,project.music,project.timeFormat)}</strong><small>/ {formatTimecode(projectDuration)}</small></div><div className="master"><span>{t('总音量','Master')}</span><Fader value={project.masterGain} max={0} label={t('总音量','Master volume')} onChange={masterGain=>update({...project,masterGain})}/></div></footer></main>}
 <Preferences open={settingsOpen} onOpenChange={setSettingsOpen} en={en} settings={settings} onChange={setSettings}/></>
}
createRoot(document.getElementById('root')!).render(<App/>);
