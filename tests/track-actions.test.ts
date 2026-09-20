import {test,expect} from 'vitest'
import {randomUUID} from 'node:crypto'
import {applyTrackAction} from '../src/shared/track-actions'
import type {Project,Track} from '../src/shared/domain'
const original={id:randomUUID(),role:'original'},a={id:randomUUID(),role:'stem'},b={id:randomUUID(),role:'other',hidden:true}
const project={tracks:[original,a,b]} as Project
test('dragging before and after the target preserves hidden tracks and metadata',()=>{
 expect(applyTrackAction(project,{kind:'place',id:a.id,beforeId:b.id,after:true}).tracks).toEqual([original,b,a])
 expect(applyTrackAction(project,{kind:'place',id:b.id,beforeId:a.id}).tracks).toEqual([original,b,a])
 expect(project.tracks).toEqual([original,a,b])
})
test('protects original and rejects a stale drag target',()=>{
 expect(()=>applyTrackAction(project,{kind:'delete',id:original.id})).toThrow('original')
 expect(()=>applyTrackAction(project,{kind:'place',id:a.id,beforeId:randomUUID()})).toThrow('Target')
 expect(applyTrackAction(project,{kind:'delete',id:b.id}).tracks).toEqual([original,a])
})
