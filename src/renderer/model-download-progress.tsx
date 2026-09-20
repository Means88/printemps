import type {Project} from '../shared/domain'
import type {SeparationTask} from '../shared/api'
import {trackClips,clipDuration} from '../shared/clips'
import {formatTimecode} from '../shared/timecode'
import {stemLabel,formatModelBytes} from '../shared/stems'
import manifest from '../shared/model-manifest.json'

export function ModelDownloadProgress({task,project,en}:{task:SeparationTask;project:Project;en:boolean}){
 const t=(zh:string,english:string)=>en?english:zh
 const source=project.tracks.find(track=>track.id===task.sourceId)
 const clip=source&&trackClips(source).find(clip=>clip.id===task.clipId)
 const rows=task.downloadModels??[],current=rows.find(row=>row.id===task.stem)
 const percent=Math.round(Math.max(0,Math.min(1,current?current.received/current.total:task.progress))*100)
 const filename=manifest.models.find(model=>model.id===task.stem)?.weight.path.split('/').at(-1)
 const peaks=source?.peaks.slice(clip?Math.floor(clip.start/source.duration*source.peaks.length):0,clip?Math.ceil(clip.end/source.duration*source.peaks.length):undefined)??[]
 return <div className="model-download-layout"><section>
  <div className="model-download-heading"><h3>{task.stem?stemLabel(task.stem,en):t('准备模型','Preparing models')}</h3><strong>{percent}%</strong></div>
  {filename&&<small className="model-download-file">{filename}</small>}
  <div className="task-progress" role="progressbar" aria-label={t('当前模型进度','Current model progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{width:`${percent}%`}}/></div>
  <small>{current?`${formatModelBytes(current.received)} / ${formatModelBytes(current.total)}`:'—'}</small>
  <ul className="model-download-queue">{rows.map(row=><li key={row.id}><span>{stemLabel(row.id,en)}</span><span className={row.ready?'ready':''}>{row.ready?t('已就绪','Ready'):row.id===task.stem?(task.phase==='failed'?t('下载中断','Interrupted'):t('下载中','Downloading')):t('等待下载','Waiting')}</span><small>{row.ready?formatModelBytes(row.total):`${formatModelBytes(row.received)} / ${formatModelBytes(row.total)}`}</small></li>)}</ul>
 </section><aside className="model-download-source"><small>{t('来源剪辑','Source clip')}</small><h3>{clip?.name??source?.name??project.name}</h3><small>{formatTimecode(clip?clipDuration(clip):source?.duration??0)} · {source?`${source.sampleRate/1000} kHz · ${source.channels===1?'Mono':'Stereo'}`:''}</small>
 <svg aria-hidden="true" viewBox={`0 0 ${Math.max(1,peaks.length)} 100`} preserveAspectRatio="none"><path d={peaks.map((v,i)=>`M${i},${50-v*44}v${v*88}`).join(' ')} stroke="#70abec" strokeWidth="1"/></svg>
 </aside></div>
}
