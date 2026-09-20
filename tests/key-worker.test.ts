import {test,expect} from 'vitest'
import {mkdtemp,writeFile,rm,copyFile,mkdir} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {analyzeKey} from '../src/main/key-worker'
test('real isolated Essentia WASM analyzes a canonical C-major chord and rejects corrupt audio',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-key-'))
 try{
  // Mirror packaged worker layout, independent of Python and project node_modules resolution.
  await mkdir(path.join(root,'essentia'))
  await writeFile(path.join(root,'package.json'),JSON.stringify({type:'commonjs'}))
  await copyFile('worker/key.cjs',path.join(root,'key.cjs'))
  for(const name of ['essentia-wasm.umd.js','essentia.js-core.umd.js'])await copyFile(path.join('node_modules/essentia.js/dist',name),path.join(root,'essentia',name))
  const frames=44100*4,b=Buffer.alloc(44+frames*8)
  b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(3,20);b.writeUInt16LE(2,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(352800,28);b.writeUInt16LE(8,32);b.writeUInt16LE(32,34);b.write('data',36);b.writeUInt32LE(b.length-44,40)
  for(let i=0;i<frames;i++){const value=[261.63,329.63,392].reduce((sum,f)=>sum+Math.sin(2*Math.PI*f*i/44100)*.1,0);b.writeFloatLE(value,44+i*8);b.writeFloatLE(value,48+i*8)}
  const file=path.join(root,'input.wav'),script=path.join(root,'key.cjs');await writeFile(file,b)
  const result=await analyzeKey(script,file,new AbortController().signal)
  expect(result.key).toBe('C major');expect(result.strength).toBeGreaterThan(.8)
  const controller=new AbortController();controller.abort();await expect(analyzeKey(script,file,controller.signal)).rejects.toThrow('cancelled')
  await writeFile(file,'invalid audio');await expect(analyzeKey(script,file,new AbortController().signal)).rejects.toThrow('Invalid canonical')
 }finally{await rm(root,{recursive:true,force:true})}
},10000)
