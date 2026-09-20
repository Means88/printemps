import {z} from 'zod'
import {musicalSchema,projectSchema,trackSchema,type Project} from './domain'

const trackEditsSchema=trackSchema.pick({id:true,assetId:true,name:true,gain:true,muted:true,solo:true,hidden:true}).partial({name:true,gain:true,muted:true,solo:true,hidden:true}).strict()
export const projectEditsSchema=projectSchema.pick({name:true,metronome:true,clickGain:true,timeFormat:true,monitor:true,masterGain:true}).partial().extend({
 music:musicalSchema.partial().strict().optional(),
 tracks:z.array(trackEditsSchema).optional()
}).strict()
export type ProjectEdits=z.infer<typeof projectEditsSchema>
const fields=['name','metronome','clickGain','timeFormat','monitor','masterGain'] as const
const musicFields=['bpm','key','meter','firstBeat'] as const
const trackFields=['name','gain','muted','solo','hidden'] as const

/** Compare against the render that produced the edit, not a newer async snapshot. */
export function diffProjectEdits(base:Project,next:Project):ProjectEdits {
 if(base.id!==next.id)throw new Error('Project identity is immutable')
 const edits:Record<string,unknown>={}
 for(const field of fields)if(base[field]!==next[field])edits[field]=next[field]
 const music:Record<string,unknown>={}
 for(const field of musicFields)if(base.music[field]!==next.music[field])music[field]=next.music[field]
 if(Object.keys(music).length)edits.music=music
 const before=new Map(base.tracks.map(track=>[track.id,track]))
 const tracks:Record<string,unknown>[]=[]
 for(const track of next.tracks){
  const old=before.get(track.id);if(!old)continue
  if(old.assetId!==track.assetId)throw new Error('Track identity is immutable')
  const changed:Record<string,unknown>={}
  for(const field of trackFields)if(old[field]!==track[field])changed[field]=track[field]
  if(Object.keys(changed).length)tracks.push({id:track.id,assetId:track.assetId,...changed})
 }
 if(tracks.length)edits.tracks=tracks
 return projectEditsSchema.parse(edits)
}

/** Apply metadata only: task-owned topology, assets and analysis never come from the UI. */
export function applyProjectEdits(current:Project,input:ProjectEdits):Project {
 const {tracks:trackEdits,music,...edits}=projectEditsSchema.parse(input)
 const byId=new Map(trackEdits?.map(track=>[track.id,track]))
 if(byId.size!==(trackEdits?.length??0))throw new Error('Duplicate track identity')
 const tracks=current.tracks.map(track=>{
  const edit=byId.get(track.id);if(!edit)return track
  if(edit.assetId!==track.assetId)throw new Error('Track identity is immutable')
  const {id,assetId,...values}=edit
  return {...track,...values}
 })
 return {...current,...edits,music:{...current.music,...music},tracks,updatedAt:new Date().toISOString()}
}
