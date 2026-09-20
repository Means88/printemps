import type {Project} from './domain'
import type {SeparationTask} from './api'

/** Reconstruct recovery controls only when their source and unfinished targets still exist. */
export function recoverSeparationTask(project:Project):SeparationTask|null{
 const record=project.lastSeparation
 if(!record||!['failed','cancelled','interrupted'].includes(record.state))return null
 const remaining=record.targets.slice(record.completed)
 const sourceId=record.retrySourceId||record.sourceId
 if(!remaining.length||!project.tracks.some(track=>track.id===sourceId))return null
 // Never restart an original partial task from the full mix if its remainder was not recorded.
 if(record.completed>0&&!record.retrySourceId)return null
 return {id:record.id,projectId:project.id,sourceId,clipId:record.retrySourceId?undefined:record.clipId,phase:record.state==='cancelled'?'cancelled':'failed',progress:record.completed/record.targets.length,targets:record.targets,completedStems:record.completed,retrySourceId:sourceId,remainingTargets:remaining,error:record.error||(record.state==='interrupted'?'Separation interrupted before completion':'Separation failed')}
}
