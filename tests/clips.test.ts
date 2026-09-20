import {test,expect} from 'vitest'
import {randomUUID} from 'node:crypto'
import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {applyClipAction,trackClips,clipPlaybackRanges,validateProjectClips,timelineDuration} from '../src/shared/clips'
import {commitSeparation,type Project,type Track} from '../src/shared/domain'
import {clipBuffer} from '../src/renderer/clip-buffer'
import {ProjectStore} from '../src/main/store'
import {SeparationService} from '../src/main/separation'
import {prepareExport,exportPreparedTracks} from '../src/main/export'
import {inspectWave} from '../src/main/audio'
import type {ModelCache} from '../src/main/models'
import type {SeparationTask} from '../src/shared/api'
const track=(role:Track['role']='original'):Track=>({id:randomUUID(),assetId:randomUUID(),name:'Audio',role,stem:role,color:'#abc',gain:0,muted:false,solo:false,peaks:[],duration:4,sampleRate:44100,channels:2})
const project=(t=track()):Project=>({id:randomUUID(),schemaVersion:1,name:'Clips',sourceName:'input.wav',createdAt:'',updatedAt:'',tracks:[t],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0})
test('legacy tracks become one clip; split and trim preserve source mapping and reject overlap/stale edits',()=>{
 const p=project(),t=p.tracks[0],c=trackClips(t)[0]
 const split=applyClipAction(p,{kind:'split',trackId:t.id,clipId:c.id,expected:c,at:2},randomUUID)
 const [a,b]=trackClips(split.tracks[0]);expect([a.start,a.end,a.offset,b.start,b.end,b.offset]).toEqual([0,2,0,2,4,2])
 const trimmed=applyClipAction(split,{kind:'trim',trackId:t.id,clipId:b.id,expected:b,start:2.5,end:3.5},randomUUID)
 expect(clipPlaybackRanges(trimmed.tracks[0],0,4)).toEqual([{clipId:a.id,at:0,sourceStart:0,duration:2},{clipId:b.id,at:2.5,sourceStart:2.5,duration:1}])
 expect(()=>applyClipAction(split,{kind:'trim',trackId:t.id,clipId:b.id,expected:b,start:1,end:4},randomUUID)).toThrow('overlaps')
 expect(()=>applyClipAction(trimmed,{kind:'trim',trackId:t.id,clipId:b.id,expected:b,start:2,end:4},randomUUID)).toThrow('changed')
 expect(()=>applyClipAction(p,{kind:'split',trackId:t.id,clipId:c.id,expected:c,at:0},randomUUID)).toThrow('inside')
 expect(()=>validateProjectClips({...p,tracks:[{...t,clips:[{...c,end:5}]}]})).toThrow('range')
})
test('secondary separation hides only the source clip and aligns new tracks at its offset',()=>{
 const t=track('stem'),p=project(t),c=trackClips(t)[0]
 const split=applyClipAction(p,{kind:'split',trackId:t.id,clipId:c.id,expected:c,at:2},randomUUID),selected=trackClips(split.tracks[0])[1]
 const out=commitSeparation(split,t.id,[{...track('other'),duration:2,name:'其它'},{...track('stem'),duration:2}],selected)
 const retained=out.tracks.find(x=>x.id===t.id)!
 expect(retained.hidden).toBe(false);expect(trackClips(retained).map(c=>!!c.hidden)).toEqual([false,true])
 expect(out.tracks.slice(0,2).map(t=>trackClips(t)[0].offset)).toEqual([2,2])
 expect(out.tracks[0].name).toBe('Audio - 其它');expect(out.tracks[0].clips![0].name).toBe(out.tracks[0].name)
})
function buffer(data:number[],rate=4){const samples=Float32Array.from(data);return {duration:data.length/rate,length:data.length,sampleRate:rate,numberOfChannels:1,getChannelData:()=>samples} as unknown as AudioBuffer}
test('splitting an unchanged source reuses its decode, but hidden or displaced clips preserve gaps',()=>{
 const source=buffer([1,2,3,4,5,6,7,8]),clips=[
  {id:randomUUID(),name:'Right',start:1,end:2,offset:1},
  {id:randomUUID(),name:'Left',start:0,end:1,offset:0}
 ]
 let allocations=0
 const context={createBuffer:(_channels:number,length:number,rate:number)=>{allocations++;return buffer(Array(length).fill(0),rate)}}
 const t={...track(),duration:2,sampleRate:4,channels:1,clips}
 expect(clipBuffer(context,source,t,2)).toBe(source)
 expect(allocations).toBe(0)
 const hidden={...t,clips:[{...clips[0],hidden:true},clips[1]]}
 expect([...clipBuffer(context,source,hidden,2).getChannelData(0)]).toEqual([1,2,3,4,0,0,0,0])
 const moved={...t,clips:[{...clips[0],offset:2},clips[1]]}
 expect([...clipBuffer(context,source,moved,3).getChannelData(0)]).toEqual([1,2,3,4,0,0,0,0,5,6,7,8])
 expect(allocations).toBe(2)
})
test('playback puts trimmed source samples at the timeline offset, leaves gaps silent, and never writes the original',()=>{
 const source=buffer([1,2,3,4,5,6,7,8]),t={...track(),duration:2,sampleRate:4,channels:1,clips:[{id:randomUUID(),name:'A',start:.5,end:1,offset:1},{id:randomUUID(),name:'B',start:1.5,end:2,offset:2}]}
 const context={createBuffer:(_channels:number,length:number,rate:number)=>buffer(Array(length).fill(0),rate)}
 const result=clipBuffer(context,source,t,3)
 expect([...result.getChannelData(0)]).toEqual([0,0,0,0,3,4,0,0,7,8,0,0]);expect([...source.getChannelData(0)]).toEqual([1,2,3,4,5,6,7,8])
})
test('real audio cropping feeds only the selected range to separation and exports just that clip',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-clips-'))
 try{
  const store=new ProjectStore(path.join(root,'private'));await store.initialize()
  const t=track(),p=project(t),clip={id:randomUUID(),name:'Middle',start:1,end:2,offset:1}
  t.clips=[clip,{id:randomUUID(),name:'Last',start:3,end:4,offset:3}]
  await mkdir(path.dirname(store.assetPath(p.id,t.assetId)),{recursive:true})
  const wav=Buffer.alloc(44+44100*4*8);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(3,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(352800,28);wav.writeUInt16LE(8,32);wav.writeUInt16LE(32,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40)
  for(let frame=0;frame<44100*4;frame++)for(let ch=0;ch<2;ch++)wav.writeFloatLE(frame>=44100&&frame<88200?.2:.8,44+frame*8+ch*4)
  await writeFile(store.assetPath(p.id,t.assetId),wav);await store.save(p)
  const cache={entry:()=>({totalBytes:1}),ensure:async()=>({weight:'unused',config:'unused'})} as unknown as ModelCache
  let finish!:(task:SeparationTask)=>void
  const done=new Promise<SeparationTask>(resolve=>finish=resolve)
  let expectedDuration=1
  const service=new SeparationService(store,'unused','unused',task=>{if(['complete','failed'].includes(task.phase))finish(task)},async(_py,_script,request)=>{
   const input=await inspectWave(request.input);expect(input.duration).toBe(expectedDuration);expect(Math.max(...input.peaks)).toBeCloseTo(.2)
   const out=path.join(request.output,'out.wav'),other=path.join(request.output,'other.wav');await copyFile(request.input,out);await copyFile(request.input,other)
   return {type:'complete',outputs:[{stem:'drums',path:out}],other}
  })
  await service.start(p.id,t.id,['drums'],cache,'cpu',clip.id)
  const task=await done;expect(task.phase,task.error).toBe('complete');await expect.poll(()=>service.busy).toBe(false)
  const result=await store.load(p.id)
  expect(result.tracks[0].clips).toEqual(t.clips)
  for(const output of result.tracks.slice(1)){expect(output.duration).toBe(1);expect(trackClips(output)[0].offset).toBe(1)}
  const stem=result.tracks.find(t=>t.role==='stem')!,full=trackClips(stem)[0]
  const split=await store.update(p.id,p=>applyClipAction(p,{kind:'split',trackId:stem.id,clipId:full.id,expected:full,at:1.5},randomUUID))
  const second=trackClips(split.tracks.find(t=>t.id===stem.id)!)[1]
  expectedDuration=.5
  const again=new Promise<SeparationTask>(resolve=>finish=resolve)
  await service.start(p.id,stem.id,['drums'],cache,'cpu',second.id)
  const secondary=await again;expect(secondary.phase,secondary.error).toBe('complete');await expect.poll(()=>service.busy).toBe(false)
  const after=await store.load(p.id),retained=after.tracks.find(t=>t.id===stem.id)!
  expect(retained.hidden).toBe(false);expect(retained.clips?.map(c=>!!c.hidden)).toEqual([false,true])
  for(const output of after.tracks.filter(t=>t.parentId===stem.id)){expect(output.duration).toBe(.5);expect(trackClips(output)[0].offset).toBe(1.5)}
  const destination=path.join(root,'export');await mkdir(destination)
  const plan=await prepareExport(store,p.id,[t.id],'wav',[clip.id]);const [file]=await exportPreparedTracks(store,plan,destination)
  expect((await inspectWave(file)).duration).toBe(1);expect(await readFile(store.assetPath(p.id,t.assetId))).toEqual(wav)
  const captured=await prepareExport(store,p.id,[t.id],'flac',[clip.id]);await store.update(p.id,p=>({...p,tracks:p.tracks.map(t=>({...t,clips:t.clips?.map(c=>({...c,end:c.start+.5}))}))}));expect((await exportPreparedTracks(store,captured,destination))[0]).toMatch(/\.flac$/)
 }finally{await rm(root,{recursive:true,force:true})}
},15000)

test('clip edits survive a fresh store, unrelated metadata saves, archive and restore',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-clip-reopen-'))
 try{
  const store=new ProjectStore(root),p=project(),t=p.tracks[0],c=trackClips(t)[0]
  await store.initialize();await store.save(p)
  const split=await store.update(p.id,p=>applyClipAction(p,{kind:'split',trackId:t.id,clipId:c.id,expected:c,at:2},randomUUID))
  const second=trackClips(split.tracks[0])[1]
  const trimmed=await store.update(p.id,p=>applyClipAction(p,{kind:'trim',trackId:t.id,clipId:second.id,expected:second,start:2.25,end:3.75},randomUUID))
  const reopened=new ProjectStore(root)
  expect((await reopened.load(p.id)).tracks[0].clips).toEqual(trimmed.tracks[0].clips)
  const {applyProjectEdits}=await import('../src/shared/project-edits')
  await reopened.update(p.id,p=>applyProjectEdits(p,{name:'Renamed project',tracks:[{id:t.id,assetId:t.assetId,gain:-6}]}))
  await reopened.remove(p.id,false)
  const [archived]=await reopened.listArchived()
  expect(archived.project.tracks[0].clips).toEqual(trimmed.tracks[0].clips)
  await reopened.restoreArchived(archived.archiveId)
  const restored=await new ProjectStore(root).load(p.id)
  expect(restored.name).toBe('Renamed project');expect(restored.tracks[0].gain).toBe(-6)
  expect(restored.tracks[0].clips).toEqual(trimmed.tracks[0].clips)
  await reopened.remove(p.id,false)
  const [invalid]=await reopened.listArchived()
  const file=path.join(root,'archived',invalid.archiveId,'project.json')
  const damaged=JSON.parse(await readFile(file,'utf8'));damaged.tracks[0].clips[1].end=100
  await writeFile(file,JSON.stringify(damaged))
  await expect(reopened.restoreArchived(invalid.archiveId)).rejects.toThrow('range')
  expect(await reopened.listArchived()).toEqual([])
 }finally{await rm(root,{recursive:true,force:true})}
})

test('showing a consumed source restores its clips without revealing hidden clips on partially consumed tracks',async()=>{
 const {applyProjectEdits}=await import('../src/shared/project-edits')
 const source=track('stem'),p=project(source),clip=trackClips(source)[0]
 const separated=commitSeparation(p,source.id,[track('other'),track('stem')],clip)
 const retained=separated.tracks.find(t=>t.id===source.id)!
 expect(retained.hidden).toBe(true);expect(retained.clips![0].hidden).toBe(true)
 const restored=applyProjectEdits(separated,{tracks:[{id:source.id,assetId:source.assetId,hidden:false}]})
 const visible=restored.tracks.find(t=>t.id===source.id)!
 expect(visible.hidden).toBe(false);expect(visible.clips![0].hidden).toBe(false)
 expect(clipPlaybackRanges(visible,0,4)).toEqual([{clipId:clip.id,at:0,sourceStart:0,duration:4}])
 expect(restored.tracks.filter(t=>t.id!==source.id)).toEqual(separated.tracks.filter(t=>t.id!==source.id))
 const split=applyClipAction(p,{kind:'split',trackId:source.id,clipId:clip.id,expected:clip,at:2},randomUUID)
 const selected=trackClips(split.tracks[0])[1]
 const partial=commitSeparation(split,source.id,[{...track('other'),duration:2},{...track('stem'),duration:2}],selected)
 const hidden=applyProjectEdits(partial,{tracks:[{id:source.id,assetId:source.assetId,hidden:true}]})
 const shown=applyProjectEdits(hidden,{tracks:[{id:source.id,assetId:source.assetId,hidden:false}]})
 expect(shown.tracks.find(t=>t.id===source.id)!.clips?.map(c=>!!c.hidden)).toEqual([false,true])
})

test('fractional sample boundaries retain exactly the same samples in playback and export',async()=>{
 const {trimFilter}=await import('../src/main/clip-audio')
 const source=buffer([1,2,3,4,5,6,7,8,9,10],10)
 const clip={id:randomUUID(),name:'Fractional',start:.14,end:.36,offset:.5}
 const t={...track(),duration:1,sampleRate:10,channels:1,clips:[clip]}
 const context={createBuffer:(_channels:number,length:number,rate:number)=>buffer(Array(length).fill(0),rate)}
 expect(trimFilter(clip,10)).toBe('atrim=start_sample=1:end_sample=4,asetpts=PTS-STARTPTS')
 expect([...clipBuffer(context,source,t,1).getChannelData(0)]).toEqual([0,0,0,0,0,2,3,4,0,0])
 const short={...t,clips:[{...clip,start:0,end:.94,offset:0}]}
 expect([...clipBuffer(context,source,short,1).getChannelData(0)]).toEqual([1,2,3,4,5,6,7,8,9,0])
})


test('project duration is independent of track order and includes offset result clips',()=>{
 const original=track(),stem={...track('stem'),duration:.5,clips:[{id:randomUUID(),name:'Excerpt',start:0,end:.5,offset:3}]}
 const p={...project(original),tracks:[stem,original]}
 expect(timelineDuration(p)).toBe(4)
 expect(timelineDuration({...p,tracks:[original,stem]})).toBe(4)
 expect(timelineDuration({...p,tracks:[{...stem,clips:[{...stem.clips[0],offset:5}]},original]})).toBe(5.5)
})
