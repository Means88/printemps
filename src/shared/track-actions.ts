import {z} from 'zod'
import type {Project} from './domain'
export const trackActionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('move'),id:z.string().uuid(),direction:z.union([z.literal(-1),z.literal(1)])}).strict(),
 z.object({kind:z.literal('place'),id:z.string().uuid(),beforeId:z.string().uuid(),after:z.boolean().optional()}).strict(),
 z.object({kind:z.literal('delete'),id:z.string().uuid()}).strict()
])
export type TrackAction=z.infer<typeof trackActionSchema>
export function applyTrackAction(project:Project,input:TrackAction):Project{
 const action=trackActionSchema.parse(input),tracks=[...project.tracks],index=tracks.findIndex(t=>t.id===action.id)
 if(index<0)throw new Error('Track no longer exists')
 if(action.kind==='delete'){
  if(tracks[index].role==='original')throw new Error('The original track cannot be deleted')
  tracks.splice(index,1)
 }else if(action.kind==='place'){
  if(action.id===action.beforeId)return project
  if(!tracks.some(t=>t.id===action.beforeId))throw new Error('Target track no longer exists')
  const [track]=tracks.splice(index,1);tracks.splice(tracks.findIndex(t=>t.id===action.beforeId)+(action.after?1:0),0,track)
 }else{
  const next=index+action.direction
  if(next>=0&&next<tracks.length)[tracks[index],tracks[next]]=[tracks[next],tracks[index]]
 }
 return {...project,tracks,updatedAt:new Date().toISOString()}
}
