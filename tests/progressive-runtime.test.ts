import {test,expect} from 'vitest'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {ProjectStore} from '../src/main/store'
import {ModelCache} from '../src/main/models'
import {SeparationService} from '../src/main/separation'
import {inspectWave} from '../src/main/audio'
import {exportTracks} from '../src/main/export'
import {trackClips,applyClipAction} from '../src/shared/clips'
import {stemColor} from '../src/shared/stems'
import type {SeparationTask} from '../src/shared/api'

const modelDirectory=process.env.PRINTEMPS_TEST_MODELS
// Explicit opt-in: normal tests never download separation models or perform expensive inference.
test.runIf(!!modelDirectory)('real progressive and secondary separation preserve residuals, ordering and private export independence',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-real-separation-'))
 let service:SeparationService|undefined
 try{
  const store=new ProjectStore(root);await store.initialize()
  const id=randomUUID(),assetId=randomUUID(),sourceId=randomUUID(),frames=44100
  const audio=Buffer.alloc(44+frames*8);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(3,20);audio.writeUInt16LE(2,22);audio.writeUInt32LE(44100,24);audio.writeUInt32LE(352800,28);audio.writeUInt16LE(8,32);audio.writeUInt16LE(32,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40)
  for(let i=0;i<frames;i++){const t=i/44100,value=.12*Math.sin(2*Math.PI*110*t)+.02*Math.sin(2*Math.PI*880*t);audio.writeFloatLE(value,44+i*8);audio.writeFloatLE(value,48+i*8)}
  await mkdir(path.dirname(store.assetPath(id,assetId)),{recursive:true});await writeFile(store.assetPath(id,assetId),audio)
  const meta=await inspectWave(store.assetPath(id,assetId))
  await store.save({schemaVersion:1,id,name:'Runtime fixture',sourceName:'synthetic.wav',createdAt:'',updatedAt:'',tracks:[{id:sourceId,assetId,name:'Original',role:'original',stem:'original',color:'#aaa',gain:0,muted:false,solo:false,...meta}],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0})
  const cache=new ModelCache(path.resolve(modelDirectory!))
  for(const id of ['drums','bass']){const entry=cache.entry(id);expect(await cache.verified(entry.weight)).toBe(true);expect(await cache.verified(entry.config)).toBe(true)}
  const published:number[]=[],snapshots:Promise<void>[]=[]
  let finish!:(task:SeparationTask)=>void
  const done=new Promise<SeparationTask>(resolve=>{finish=resolve})
  const resources=process.env.PRINTEMPS_TEST_RESOURCES
  const python=path.resolve(resources||'.runtime','python',process.platform==='win32'?'python.exe':'bin/python3')
  const script=resources?path.resolve(resources,'worker/separate.py'):path.resolve('worker/separate.py')
  service=new SeparationService(store,()=>python,script,task=>{
   if(task.completedStems&&!published.includes(task.completedStems)){
    published.push(task.completedStems)
    console.info(`Published ${task.completedStems} real stem(s)`)
    snapshots.push(store.load(id).then(p=>{expect(p.tracks.filter(t=>t.role==='stem')).toHaveLength(task.completedStems!)}))
   }
   if(['complete','failed','cancelled'].includes(task.phase))finish(task)
  })
  await service.start(id,sourceId,['drums','bass'],cache,'cpu')
  const task=await done
  expect(task.error).toBeUndefined();expect(task.phase).toBe('complete')
  await Promise.all(snapshots);expect(published).toEqual([1,2])
  const project=await store.load(id);expect(project.tracks.map(t=>t.stem)).toEqual(['original','other','drums','bass'])
  const sum=new Float64Array(frames*2)
  for(const track of project.tracks.slice(1)){
   const filename=store.assetPath(id,track.assetId),result=await inspectWave(filename)
   expect(result.duration).toBe(1);expect(result.channels).toBe(2);expect(result.sampleRate).toBe(44100)
   const wav=await readFile(filename)
   let at=12
   while(at+8<wav.length&&wav.toString('ascii',at,at+4)!=='data'){const size=wav.readUInt32LE(at+4);at+=8+size+(size%2)}
   for(let i=0;i<sum.length;i++)sum[i]+=wav.readFloatLE(at+8+i*4)
  }
  let maxError=0
  for(let i=0;i<sum.length;i++)maxError=Math.max(maxError,Math.abs(sum[i]-audio.readFloatLE(44+i*4)))
  expect(maxError).toBeLessThan(1e-5);console.info({maxReconstructionError:maxError})
  await expect.poll(()=>service!.busy,{timeout:5000}).toBe(false)
  // A real secondary extraction inserts [Other, B] at A and retains A hidden
  // without changing its neighbours, user mix settings or private source bytes.
  const source=project.tracks[3],sourceBytes=await readFile(store.assetPath(id,source.assetId))
  await store.update(id,current=>({...current,tracks:current.tracks.map(t=>t.id===source.id?{...t,name:'Edited bass',gain:-7,muted:true}:t)}))
  const current=await store.load(id),originalClip=trackClips(current.tracks.find(t=>t.id===source.id)!)[0]
  const trimmed=await store.update(id,p=>applyClipAction(p,{kind:'trim',trackId:source.id,clipId:originalClip.id,expected:originalClip,start:.25,end:.75},randomUUID))
  const selected=trackClips(trimmed.tracks.find(t=>t.id===source.id)!)[0]
  const secondaryDone=new Promise<SeparationTask>(resolve=>{finish=resolve})
  await service.start(id,source.id,['drums'],cache,'cpu',selected.id)
  const secondaryTask=await secondaryDone
  expect(secondaryTask.error).toBeUndefined();expect(secondaryTask.phase).toBe('complete')
  await expect.poll(()=>service!.busy,{timeout:5000}).toBe(false)
  const secondary=await store.load(id)
  expect(secondary.tracks.slice(0,3)).toEqual(project.tracks.slice(0,3))
  expect(secondary.tracks.map(t=>t.stem)).toEqual(['original','other','drums','other','drums','bass'])
  expect(secondary.tracks[5]).toEqual({...trimmed.tracks.find(t=>t.id===source.id)!,hidden:true,clips:[{...selected,hidden:true}]})
  const outputs=secondary.tracks.slice(3,5)
  expect(outputs[0].name).toBe(`${selected.name} - 其它`)
  expect(outputs.every(track=>!track.hidden)).toBe(true)
  for(const track of outputs){
   expect(track.parentId).toBe(source.id);expect(track.gain).toBe(-7);expect(track.muted).toBe(true)
   expect(track.color).toBe(stemColor(track.stem));expect(track.duration).toBe(.5);expect(trackClips(track)[0].offset).toBe(.25)
  }
  expect(secondary.tracks[2].color).toBe(secondary.tracks[4].color)
  const samples=(wav:Buffer)=>{
   let offset=12
   while(offset+8<wav.length&&wav.toString('ascii',offset,offset+4)!=='data'){const size=wav.readUInt32LE(offset+4);offset+=8+size+(size%2)}
   return Array.from({length:wav.readUInt32LE(offset+4)/4},(_,i)=>wav.readFloatLE(offset+8+i*4))
  }
  const before=samples(sourceBytes).slice(44100*.25*2,44100*.75*2),parts=await Promise.all(outputs.map(async t=>samples(await readFile(store.assetPath(id,t.assetId)))))
  const secondaryError=Math.max(...before.map((value,i)=>Math.abs(value-parts[0][i]-parts[1][i])))
  expect(secondaryError).toBeLessThan(1e-5)
  expect(await readFile(store.assetPath(id,source.assetId))).toEqual(sourceBytes)
  const exportDirectory=await mkdtemp(path.join(tmpdir(),'printemps-real-export-'))
  try{
   const privateBytes=await readFile(store.assetPath(id,outputs[0].assetId))
   const wavs=await exportTracks(store,id,outputs.map(t=>t.id),exportDirectory,'wav')
   const flacs=await exportTracks(store,id,outputs.map(t=>t.id),exportDirectory,'flac')
   expect(wavs).toHaveLength(2);expect(flacs).toHaveLength(2)
   expect((await inspectWave(wavs[0])).duration).toBe(.5)
   expect((await readFile(flacs[0])).subarray(0,4).toString()).toBe('fLaC')
   await writeFile(wavs[0],Buffer.from('External edit to exported copy'))
   expect(await readFile(store.assetPath(id,outputs[0].assetId))).toEqual(privateBytes)
  }finally{await rm(exportDirectory,{recursive:true,force:true})}
  console.info({secondaryReconstructionError:secondaryError,secondaryOrder:outputs.map(t=>t.stem),privateExportIndependent:true})
 }finally{
  if(service?.busy){service.cancel(service.status()!.id);await expect.poll(()=>service!.busy,{timeout:10000}).toBe(false)}
  await rm(root,{recursive:true,force:true})
 }
},300000)
