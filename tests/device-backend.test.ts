import {test,expect} from 'vitest'
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {workerEnvironment} from '../src/main/json-worker'

const python=process.platform==='win32'?'.runtime/python/python.exe':'.runtime/python/bin/python3'
const ready=existsSync(python)

// The probe is what tells the UI whether a GPU is NVIDIA or AMD, so it runs against the real runtime.
test.skipIf(!ready)('the device probe reports the torch backend so the UI can name it',async()=>{
 const result=await new Promise<any>((resolve,reject)=>{
  const child=spawn(python,['-u',path.join('worker','device_probe.py')],{env:workerEnvironment()})
  let out='',err=''
  child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b)
  child.on('error',reject)
  child.on('close',()=>{try{resolve(JSON.parse(out.trim().split('\n').pop()!))}catch(e){reject(new Error(err||String(e)))}})
  child.stdin.end('{}\n')
 })
 expect(result.type).toBe('result')
 expect(result.missing).toEqual([])
 expect(result.torch).toMatch(/^\d+\.\d+/)
 // '' on a CPU-only build, 'cuda' on an NVIDIA build, 'rocm' on an AMD one.
 expect(['','cuda','rocm']).toContain(result.backend)
 // A ROCm build answers torch.cuda.is_available(), so cuda true must carry a backend name.
 if(result.cuda)expect(result.backend).not.toBe('')
})
