import {test,expect} from 'vitest'
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {ProjectStore} from '../src/main/store'
import {AudioImporter} from '../src/main/import'
test('native and dropped imports share single-file validation and create independent private audio',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-import-'))
 try{
  const store=new ProjectStore(path.join(root,'private'));await store.initialize();const importer=new AudioImporter(store)
  const source=path.join(root,'my song.wav'),b=Buffer.alloc(44+441*4)
  b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(176400,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40)
  await writeFile(source,b)
  const pending=importer.import(source);await expect(importer.import(source)).rejects.toThrow('Another');const project=await pending
  expect(project.tracks).toHaveLength(1);expect(project.monitor).toBe('original');expect(project.recommendation).toBeNull();expect(project.name).toBe('my song')
  const file=store.assetPath(project.id,project.tracks[0].assetId),privateAudio=await readFile(file)
  await writeFile(source,'external edit');expect(await readFile(file)).toEqual(privateAudio)
  await expect(importer.import(source)).rejects.toThrow();expect(await store.list()).toHaveLength(1)
  await expect(importer.import('https://example.org/audio.wav')).rejects.toThrow('local')
  const directory=path.join(root,'directory.wav');await mkdir(directory);await expect(importer.import(directory)).rejects.toThrow('directory')
 }finally{await rm(root,{recursive:true,force:true})}
})
