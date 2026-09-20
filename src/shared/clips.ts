import {z} from 'zod'
import type {Project,Track} from './domain'
export const clipSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(80),start:z.number().finite().min(0),end:z.number().finite().positive(),offset:z.number().finite().min(0),hidden:z.boolean().optional()}).strict().refine(c=>c.end>c.start,'Clip must have positive duration')
export type Clip=z.infer<typeof clipSchema>
export function trackClips(track:Track):Clip[]{return track.clips??[{id:track.id,name:track.name,start:0,end:track.duration,offset:0}]}
export function clipDuration(c:Clip){return c.end-c.start}
/** Round source boundaries independently, matching FFmpeg's exclusive end sample. */
export function clipSampleRange(c:Pick<Clip,'start'|'end'>,sampleRate:number){
 const start=Math.round(c.start*sampleRate),end=Math.round(c.end*sampleRate)
 return {start,end,length:Math.max(0,end-start)}
}
export function timelineDuration(project:Project){return Math.max(0,...project.tracks.map(t=>t.role==='original'?t.duration:0),...project.tracks.flatMap(t=>trackClips(t).filter(c=>!c.hidden).map(c=>c.offset+clipDuration(c))))}
export function selectedClip(track:Track,id?:string){const clips=trackClips(track);const c=id?clips.find(c=>c.id===id):clips.length===1?clips[0]:undefined;if(!c||c.hidden)throw new Error('Select an available clip');return c}
const identity={trackId:z.string().uuid(),clipId:z.string().uuid(),expected:clipSchema}
export const clipActionSchema=z.discriminatedUnion('kind',[
 z.object({...identity,kind:z.literal('split'),at:z.number().finite().nonnegative()}).strict(),
 z.object({...identity,kind:z.literal('trim'),start:z.number().finite().nonnegative(),end:z.number().finite().positive()}).strict(),
 z.object({...identity,kind:z.literal('rename'),name:z.string().trim().min(1).max(80)}).strict()
])
export type ClipAction=z.infer<typeof clipActionSchema>
export function applyClipAction(project:Project,input:ClipAction,newId:()=>string):Project{
 const action=clipActionSchema.parse(input),track=project.tracks.find(t=>t.id===action.trackId)
 if(!track||track.hidden)throw new Error('Track unavailable')
 const clips=trackClips(track),clip=selectedClip(track,action.clipId)
 if(JSON.stringify(clip)!==JSON.stringify(action.expected))throw new Error('Clip changed. Please select it again.')
 const sample=1/track.sampleRate
 let replacements:Clip[]
 if(action.kind==='rename')replacements=[{...clip,name:action.name}]
 else if(action.kind==='split'){
  const sourceAt=Math.round((clip.start+action.at-clip.offset)*track.sampleRate)/track.sampleRate
  if(sourceAt-clip.start<sample||clip.end-sourceAt<sample)throw new Error('Place the playhead inside the clip')
  replacements=[{...clip,end:sourceAt},{...clip,id:newId(),start:sourceAt,offset:clip.offset+sourceAt-clip.start}]
 }else{
  if(action.end>track.duration+sample/2||action.end-action.start<sample)throw new Error('Invalid source range')
  const offset=clip.offset+action.start-clip.start
  if(offset<0)throw new Error('Clip cannot start before the timeline')
  const end=offset+action.end-action.start
  if(clips.some(c=>c.id!==clip.id&&!c.hidden&&offset<c.offset+clipDuration(c)-sample/2&&end>c.offset+sample/2))throw new Error('Clip overlaps another clip')
  replacements=[{...clip,start:action.start,end:action.end,offset}]
 }
 const updated=clips.flatMap(c=>c.id===clip.id?replacements:[c]).map(c=>clipSchema.parse(c))
 return {...project,tracks:project.tracks.map(t=>t.id===track.id?{...t,clips:updated}:t),updatedAt:new Date().toISOString()}
}
/** Map timeline time to the exact source range; gaps are silent. */
export function clipPlaybackRanges(track:Track,from:number,to:number){return trackClips(track).filter(c=>!c.hidden).flatMap(c=>{const start=Math.max(from,c.offset),end=Math.min(to,c.offset+clipDuration(c));return end>start?[{clipId:c.id,at:start,sourceStart:c.start+start-c.offset,duration:end-start}]:[]})}

export function validateProjectClips(project:Project):Project{
 for(const track of project.tracks){
  if(!track.clips)continue
  const ids=new Set<string>(),visible=track.clips.filter(c=>!c.hidden).sort((a,b)=>a.offset-b.offset)
  for(const c of track.clips){if(ids.has(c.id)||c.end>track.duration+1/track.sampleRate)throw new Error('Invalid clip range or duplicate identity');ids.add(c.id)}
  for(let i=1;i<visible.length;i++)if(visible[i].offset<visible[i-1].offset+clipDuration(visible[i-1])-1/track.sampleRate)throw new Error('Overlapping clips')
 }
 return project
}
