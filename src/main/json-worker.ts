import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

/**
 * The request is written as UTF-8, so the worker must read it as UTF-8. Python 3.14 still decodes
 * stdio with the locale code page on Windows, and a DBCS page such as GBK swallows the backslash
 * after an odd run of non-ASCII bytes as a trail byte, turning an escaped path separator into an
 * invalid JSON escape. Any project path containing one CJK character was enough to break separation.
 */
export function workerEnvironment(parentPid:number=process.pid):NodeJS.ProcessEnv{
 const environment:NodeJS.ProcessEnv={...process.env,PYTHONUNBUFFERED:'1',PYTHONNOUSERSITE:'1',PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8',PRINTEMPS_PARENT_PID:String(parentPid)}
 delete environment.PYTHONHOME;delete environment.PYTHONPATH
 return environment
}
export function runJsonWorker<T>(python:string,script:string,request:unknown,signal:AbortSignal,onEvent:(event:any)=>T|undefined,interpreterArgs:string[]=['-u']):Promise<T> {
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new Error('Task cancelled'));return}
  const environment=workerEnvironment()
  const child=spawn(python,[...interpreterArgs,script],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:environment})
  let result:T|undefined,error='',diagnostics='',aborted=false,killTimer:ReturnType<typeof setTimeout>|undefined
  const stop=()=>{
   child.kill('SIGTERM')
   killTimer??=setTimeout(()=>child.kill('SIGKILL'),3000)
   killTimer.unref()
  }
  const cancel=()=>{aborted=true;stop()}
  signal.addEventListener('abort',cancel,{once:true})
  const lines=createInterface({input:child.stdout})
  child.stderr.on('data',(b:Buffer)=>{diagnostics=(diagnostics+b.toString()).slice(-6000)})
  lines.on('line',line=>{
   if(error||aborted)return
   try{
    if(line.length>8*1024*1024)throw new Error('Oversized worker response')
    const event=JSON.parse(line)
    if(result!==undefined)throw new Error('Unexpected event after completion')
    if(event.type==='error')throw new Error(typeof event.message==='string'?event.message:'Task failed')
    result=onEvent(event)
   }catch(e){error=e instanceof Error?e.message:'Invalid worker response';stop()}
  })
  // Spawn errors are followed by close; keep one completion path and release listeners there.
  child.on('error',e=>{error=e.message})
  child.stdin.on('error',e=>{if(!error)error=e.message})
  child.on('close',code=>{
   lines.close();signal.removeEventListener('abort',cancel);if(killTimer)clearTimeout(killTimer)
   if(aborted)reject(new Error('Task cancelled'))
   else if(error||code!==0||result===undefined)reject(new Error(error||diagnostics||'Worker ended without results'))
   else resolve(result)
  })
  child.stdin.end(JSON.stringify(request)+'\n')
 })
}
