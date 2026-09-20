import { test,expect } from 'vitest'
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { safeFilename,exportTracks,prepareExport,exportPreparedTracks,PartialExportError } from '../src/main/export'
import { ProjectStore } from '../src/main/store'
import type { Project } from '../src/shared/domain'
test('export sanitizes path characters and Windows reserved basenames',()=>{
 expect(safeFilename('../vocal:test')).not.toContain('/')
 expect(safeFilename('CON')).toBe('track_CON')
})
test('export preserves captured selections, independent files, collision safety and partial-failure recovery',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-export-'))
 try{
  const store=new ProjectStore(path.join(root,'private'));await store.initialize()
  const id=randomUUID(),assetId=randomUUID(),trackId=randomUUID();const {mkdir}=await import('node:fs/promises')
  await mkdir(path.dirname(store.assetPath(id,assetId)),{recursive:true});const destination=path.join(root,'export');await mkdir(destination)
  const wav=Buffer.alloc(44+8820*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(176400,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40)
  await writeFile(store.assetPath(id,assetId),wav)
  const p:Project={schemaVersion:1,id,name:'Song',sourceName:'song.wav',createdAt:'',updatedAt:'',tracks:[{id:trackId,assetId,role:'original',stem:'original',name:'Track',gain:-12,muted:true,solo:false,color:'#aaa',duration:.2,sampleRate:44100,channels:2,peaks:[]}],music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'original',masterGain:0}
  await store.save(p)
  const [first]=await exportTracks(store,id,[trackId],destination,'wav')
  const [second]=await exportTracks(store,id,[trackId],destination,'wav')
  expect(second).not.toBe(first)
  const [flac]=await exportTracks(store,id,[trackId],destination,'flac');expect((await readFile(flac)).subarray(0,4).toString()).toBe('fLaC')
  await writeFile(first,'external edit');expect(await readFile(store.assetPath(id,assetId))).toEqual(wav)
  await expect(exportTracks(store,id,[trackId],store.root,'wav')).rejects.toThrow('outside')
  // Simulate a separation commit while the user is choosing the destination.
  const captured=await prepareExport(store,id,[trackId],'wav')
  await store.save({...p,name:'Renamed later',tracks:[{...p.tracks[0],id:randomUUID(),assetId:randomUUID(),name:'Replacement'}]})
  const [capturedFile]=await exportPreparedTracks(store,captured,destination)
  expect(path.basename(capturedFile)).toMatch(/^Song_Track/)
  expect((await readFile(capturedFile)).subarray(0,4).toString()).toBe('RIFF')
  await expect(prepareExport(store,id,[trackId],'wav')).rejects.toThrow('replaced')
  await expect(prepareExport(store,id,[],'wav')).rejects.toThrow('Invalid export selection')
  const missingId=randomUUID(),laterId=randomUUID()
  await store.save({...p,tracks:[...p.tracks,{...p.tracks[0],id:missingId,assetId:randomUUID(),name:'Missing'},{...p.tracks[0],id:laterId,name:'Later'}]})
  const failure=await exportTracks(store,id,[trackId,missingId,laterId],destination,'wav').catch(error=>error)
  expect(failure).toBeInstanceOf(PartialExportError)
  expect(failure.files).toHaveLength(1)
  expect(failure.remainingIds).toEqual([missingId,laterId])
  expect(failure.trackName).toBe('Missing')
  expect((await readFile(failure.files[0])).subarray(0,4).toString()).toBe('RIFF')
  const {readdir}=await import('node:fs/promises')
  expect((await readdir(destination)).some(name=>name.endsWith('.tmp'))).toBe(false)

 }finally{await rm(root,{recursive:true,force:true})}
},20000)
