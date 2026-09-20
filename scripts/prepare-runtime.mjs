import {spawn} from 'node:child_process'
import {promises as fs} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const staging=path.join(root,'.cache','python-build'),destination=path.join(root,'.runtime','python')
const uv=process.env.PRINTEMPS_UV||path.join(root,'.venv',process.platform==='win32'?'Scripts/uv.exe':'bin/uv')
const pythonVersion='3.14.7'
async function run(executable,args){await new Promise((resolve,reject)=>{const child=spawn(executable,args,{cwd:root,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`${path.basename(executable)} failed (${code})`)))})}
await fs.mkdir(staging,{recursive:true})
await run(uv,['python','install',pythonVersion,'--install-dir',staging,'--no-bin','--no-registry'])
const installs=(await fs.readdir(staging)).filter(name=>name.startsWith(`cpython-${pythonVersion}-`)&&!name.includes('freethreaded'))
if(installs.length!==1)throw new Error('Expected exactly one Python installation for the build host')
await fs.mkdir(path.dirname(destination),{recursive:true})
await fs.rm(destination,{recursive:true,force:true})
await fs.cp(path.join(staging,installs[0]),destination,{recursive:true,verbatimSymlinks:true})
const executable=path.join(destination,process.platform==='win32'?'python.exe':'bin/python3')
await run(uv,['pip','install','--python',executable,'--break-system-packages','--link-mode','copy','--require-hashes','-r','worker/requirements.lock'])
await run(executable,['worker/setup-assets.py'])
await run(executable,['-c',"import torch, torchaudio, soundfile; from beat_this.inference import Audio2Beats; print('Bundled inference dependencies import successfully')"])
const requirementsSha256=createHash('sha256').update(await fs.readFile(path.join(root,'worker/requirements.lock'))).digest('hex')
await fs.writeFile(path.join(root,'.runtime','manifest.json'),JSON.stringify({python:pythonVersion,platform:process.platform,arch:process.arch,requirementsSha256,builtAt:new Date().toISOString()},null,2)+'\n')
console.log(`Prepared runtime at ${destination}`)
