// Exercises the real Linux updater download path without launching an installer.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {createHash} from 'node:crypto'
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {AppImageUpdater}=require('electron-updater/out/AppImageUpdater')
const {NodeHttpExecutor}=require('builder-util/out/nodeHttpExecutor')
const {ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor')
// Keep the updater download/checksum implementation; replace only Electron net with Node HTTP.
class LocalHttpExecutor extends NodeHttpExecutor {
 download(...args){return ElectronHttpExecutor.prototype.download.apply(this,args)}
}
if(process.platform!=='linux')throw new Error('Run this verification on Linux; the updater fallback is platform-specific')
const root=await mkdtemp(path.join(tmpdir(),'printemps-update-fallback-'))
const previousAppImage=process.env.APPIMAGE
const payload=Buffer.alloc(64*1024,42)
const sha512=createHash('sha512').update(payload).digest('base64')
let fullRequests=0,rangeRequests=0,corruptPayload=false
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost')
 if(url.pathname==='/latest-linux.yml'){
  res.end(`version: 0.2.0\nfiles:\n  - url: Printemps-0.2.0.AppImage\n    size: ${payload.length}\n    blockMapSize: 16\n    sha512: ${sha512}\npath: Printemps-0.2.0.AppImage\nsha512: ${sha512}\nreleaseDate: '2026-09-20T00:00:00.000Z'\n`);return
 }
 if(url.pathname!=='/Printemps-0.2.0.AppImage'){res.writeHead(404);res.end();return}
 if(req.headers.range){rangeRequests++;res.writeHead(416);res.end();return}
 fullRequests++;res.writeHead(200,{'Content-Length':payload.length});res.end(corruptPayload?Buffer.alloc(payload.length,43):payload)
})
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const url=`http://127.0.0.1:${server.address().port}`
 for(const scenario of ['missing-old-file','invalid-old-blockmap','corrupt-full-download']){
  const dir=path.join(root,scenario);await mkdir(dir)
  corruptPayload=scenario==='corrupt-full-download'
  process.env.APPIMAGE=path.join(dir,'Printemps-0.1.0.AppImage')
  if(scenario==='invalid-old-blockmap')await writeFile(process.env.APPIMAGE,Buffer.alloc(32))
  const config=path.join(dir,'app-update.yml');await writeFile(config,`provider: generic\nurl: ${url}\nupdaterCacheDirName: updater\n`)
  let quitCalls=0;const messages=[]
  const app={version:'0.1.0',name:'Printemps',isPackaged:true,appUpdateConfigPath:config,userDataPath:dir,baseCachePath:dir,whenReady:async()=>{},relaunch:()=>{quitCalls++},quit:()=>{quitCalls++},onQuit:()=>{}}
  const updater=new AppImageUpdater(null,app)
  updater.httpExecutor=new LocalHttpExecutor();updater.setFeedURL({provider:'generic',url});updater.autoDownload=false;updater.autoInstallOnAppQuit=false
  updater.logger={info:()=>{},warn:()=>{},error:message=>messages.push(String(message))}
  const before=fullRequests
  const sentinel=path.join(dir,'private-result.wav');await writeFile(sentinel,'unchanged private audio')
  await updater.checkForUpdates()
  if(corruptPayload){
   let downloaded=false;updater.on('update-downloaded',()=>{downloaded=true})
   await assert.rejects(updater.downloadUpdate(),/checksum mismatch/i)
   assert.equal(downloaded,false)
  }else{
   const files=await updater.downloadUpdate()
   assert.deepEqual(await readFile(files[0]),payload)
  }
  assert.equal(fullRequests,before+1)
  assert(messages.some(message=>message.includes('fallback to full download')))
  assert.equal(await readFile(sentinel,'utf8'),'unchanged private audio')
  assert.equal(quitCalls,0)
  console.log(`${scenario}: full fallback, expected checksum outcome, no install or private-data change`)
 }
 assert(rangeRequests>0)
 console.log(JSON.stringify({fullRequests,rangeRequests,scope:'Linux updater check/download only; synthetic payload, no installation'},null,2))
}finally{
 if(previousAppImage===undefined)delete process.env.APPIMAGE;else process.env.APPIMAGE=previousAppImage
 await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true})
}
