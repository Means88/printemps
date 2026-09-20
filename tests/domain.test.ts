import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import {applyProjectEdits,diffProjectEdits} from '../src/shared/project-edits'
import { commitSeparation, restoreRecommendation, audibleTracks, beatPosition, rename, type Track, type Project } from '../src/shared/domain'
const track = (role: Track['role'], name: string): Track => ({id:randomUUID(),assetId:randomUUID(),name,role,stem:name,color:'#aaa',gain:-3,muted:false,solo:false,peaks:[],duration:10,sampleRate:44100,channels:2})
const make = (): Project => ({schemaVersion:1,id:randomUUID(),name:'Song',sourceName:'song.wav',createdAt:'',updatedAt:'',tracks:[track('original','Original'),track('stem','X'),track('stem','A'),track('stem','Y')],music:{bpm:120,key:'A minor',meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:0})
describe('Project invariants',()=>{
 it('inserts remainder C then B at A, retaining A hidden and keeping neighbours',()=>{
  const p=make();p.tracks[2].muted=true
  const next=commitSeparation(p,p.tracks[2].id,[track('stem','B'),track('other','C')])
  expect(next.tracks.map(t=>t.name)).toEqual(['Original','X','A - C','B','A','Y'])
  expect(next.tracks[2].muted).toBe(true);expect(p.tracks.map(t=>t.name)).toContain('A')
 })
 it('preserves the original and rejects incomplete replacement',()=>{
  const p=make();expect(()=>commitSeparation(p,p.tracks[2].id,[track('stem','B')])).toThrow()
  expect(commitSeparation(p,p.tracks[0].id,[track('stem','B'),track('other','C')]).tracks[0]).toEqual(p.tracks[0])
 })
 it('restores only available recommendations, including first beat zero',()=>{
  const p=make();p.music.firstBeat=4;p.recommendation={bpm:128,key:null,firstBeat:0}
  expect(restoreRecommendation(p).music).toEqual({bpm:128,key:'A minor',meter:'4/4',firstBeat:0})
 })
 it('keeps original and stems exclusive and mute wins over solo',()=>{
  const p=make();p.tracks[2].solo=true;p.tracks[2].muted=true
  expect(audibleTracks(p)).toEqual([]);p.monitor='original';expect(audibleTracks(p)).toEqual([p.tracks[0]])
 })
 it('maps compound meter using quarter-note BPM and pickup offset',()=>{
  const music={bpm:120,key:null,meter:'6/8' as const,firstBeat:2}
  expect(beatPosition(1,music)?.bar).toBe(0)
  expect(beatPosition(3.5,music)).toEqual({bar:2,beat:1,beatSeconds:.25})
 })
 it('validates display names without treating them as file paths',()=>{
  expect(rename('  My vocal  ')).toBe('My vocal');expect(()=>rename('  ')).toThrow()
 })
})

it('merges delayed metadata edits without removing new results or revealing hidden source tracks',()=>{
 const before=make(),newTracks=[track('stem','B'),track('other','C')]
 const current=commitSeparation(before,before.tracks[2].id,newTracks)
 current.recommendation={bpm:132}
 const pending={...before,name:'Edited project',tracks:before.tracks.map(t=>t.id===before.tracks[1].id?{...t,name:'Renamed X',gain:-9}:t)}
 const merged=applyProjectEdits(current,diffProjectEdits(before,pending))
 expect(merged.name).toBe('Edited project')
 expect(merged.tracks.map(t=>t.name)).toEqual(['Original','Renamed X','A - C','B','A','Y'])
 expect(merged.tracks[1].gain).toBe(-9)
 expect(merged.tracks[2]).toEqual(current.tracks[2]);expect(merged.recommendation).toEqual({bpm:132})
 expect(()=>applyProjectEdits(current,{tracks:[{id:before.tracks[0].id,assetId:randomUUID(),name:'Changed'}]})).toThrow('immutable')
})

it('keeps secondary sources hidden and excludes hidden solo tracks from the mix',()=>{
 const p=make(),source=p.tracks[2];source.solo=true
 const next=commitSeparation(p,source.id,[track('stem','B'),track('other','C')])
 expect(next.tracks.find(t=>t.id===source.id)).toEqual({...source,hidden:true})
 expect(next.tracks.filter(t=>!t.hidden).map(t=>t.name)).toEqual(['Original','X','A - C','B','Y'])
 const hiddenSolo={...p,tracks:p.tracks.map(t=>t.id===source.id?{...t,hidden:true}:t)}
 expect(audibleTracks(hiddenSolo).map(t=>t.name)).toEqual(['X','Y'])
})

 it('names secondary remainder from current source and preserves the localized suffix',()=>{
  for(const label of ['其它','Other']){
   const p=make();p.tracks[2].name='自定义主唱'
   const result=commitSeparation(p,p.tracks[2].id,[track('other',label),track('stem','B')])
   expect(result.tracks[2].name).toBe(`自定义主唱 - ${label}`)
   expect(commitSeparation(p,p.tracks[0].id,[track('other',label),track('stem','B')]).tracks[4].name).toBe(label)
   p.tracks[2].name='长'.repeat(80)
   const long=commitSeparation(p,p.tracks[2].id,[track('other',label),track('stem','B')]).tracks[2].name
   expect(long).toHaveLength(80);expect(long.endsWith(` - ${label}`)).toBe(true)
  }
 })
