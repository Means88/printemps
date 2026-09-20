import {test,expect} from 'vitest'
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import path from 'node:path'

test('Python task exits when its owning process is forcibly killed',async()=>{
 const local=path.resolve('.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python')
 const python=existsSync(local)?local:process.platform==='win32'?'python':'python3'
 const script=`import sys,os,time;sys.path.insert(0,sys.argv[1]);from parent_lifetime import watch_parent;watch_parent();print(os.getpid(),flush=True);time.sleep(60)`
 const owner=spawn(process.execPath,['-e',`const {spawn}=require('node:child_process');spawn(process.argv[1],['-u','-c',process.argv[2],process.argv[3]],{stdio:['ignore',1,2],env:{...process.env,PRINTEMPS_PARENT_PID:String(process.pid),PYTHONDONTWRITEBYTECODE:'1'}});setInterval(()=>{},1000)`,python,script,path.resolve('worker')],{stdio:['ignore','pipe','pipe']})
 let workerPid=0,diagnostic=''
 owner.stderr.on('data',b=>{diagnostic+=b})
 try{
  const ready=await new Promise<string>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Worker did not start: '+diagnostic)),8000)
   owner.stdout.once('data',b=>{clearTimeout(timeout);resolve(String(b))})
   owner.once('error',e=>{clearTimeout(timeout);reject(e)})
  })
  workerPid=Number(ready.trim());expect(workerPid).toBeGreaterThan(0)
  const closed=new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Orphan worker retained its output pipe')),5000)
   owner.stdout.once('end',()=>{clearTimeout(timeout);resolve()})
  })
  owner.kill('SIGKILL')
  // The inherited pipe only closes after both owner and Python have exited.
  await closed
  workerPid=0
 }finally{
  owner.kill('SIGKILL')
  if(workerPid)try{process.kill(workerPid,'SIGKILL')}catch{}
 }
},15000)
