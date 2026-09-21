import {runJsonWorker} from './json-worker'
import {applyClipAction,clipActionSchema} from '../shared/clips'
import {installNativeMenu} from './native-menu'
import {menuStateSchema} from '../shared/native-menu'
import {applyTrackAction,trackActionSchema} from '../shared/track-actions'
import {randomUUID} from 'node:crypto'
import {ShutdownCoordinator} from './shutdown'
import {closeSaveFailure} from '../shared/save-failure'
import electronUpdater from 'electron-updater'
import {SettingsService,type DirectoryKind} from './settings'
import type {Settings} from '../shared/domain'
import {UpdateService} from './updates'
import { app, BrowserWindow, dialog, ipcMain, protocol, net, session, shell } from 'electron'
import {proxyConfig,proxyCredentials} from './proxy'
import {createDownloadFetcher} from './download-fetch'
import {ExportFolders} from './export-folders'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {promises as fsPromises, constants as fsConstants} from 'node:fs'
import path from 'node:path'
import { ProjectStore } from './store'
import { ModelCache, modelBaseUrl } from './models'
import {TaskScheduler} from './task-scheduler'
import { AnalysisService } from './analysis'
import { SeparationService } from './separation'
import { prepareExport,exportPreparedTracks,PartialExportError } from './export'
import {AudioImporter} from './import'
import { applyProjectEdits,projectEditsSchema } from '../shared/project-edits'
const here=path.dirname(fileURLToPath(import.meta.url))
protocol.registerSchemesAsPrivileged([{scheme:'printemps',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true,corsEnabled:true}}])
let win:BrowserWindow
let ioTasks=0
const exportingProjects=new Set<string>()
const exportFolders=new ExportFolders()
const primaryInstance=app.requestSingleInstanceLock()
if(!primaryInstance)app.quit()
app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus()}})
if(primaryInstance)void app.whenReady().then(async () => {
const store=new ProjectStore(app.getPath('userData'));await store.initialize();await store.recoverInterruptedTasks()
const runtimeRoot=app.isPackaged?process.resourcesPath:app.getAppPath()
const python=app.isPackaged?path.join(runtimeRoot,'python',process.platform==='win32'?'python.exe':'bin/python3'):path.join(runtimeRoot,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python')
const scheduler=new TaskScheduler()
// Separation may run on an interpreter the user supplies (for CUDA); analysis always uses the bundled one.
let interpreter=python
const currentPython=()=>interpreter
type Probe={cuda:boolean;mps:boolean;auto:'cuda'|'cpu';torch:string;missing:string[];custom:boolean}
const probeInterpreter=(executable:string)=>runJsonWorker<Probe>(executable,path.join(runtimeRoot,'worker/device_probe.py'),{},new AbortController().signal,event=>event.type==='result'?{cuda:!!event.cuda,mps:!!event.mps,auto:event.auto==='cuda'?'cuda':'cpu',torch:String(event.torch||''),missing:Array.isArray(event.missing)?event.missing.map(String):[],custom:executable!==python}:undefined)
const separation=new SeparationService(store,currentPython,path.join(runtimeRoot,'worker/separate.py'),task=>{if(win&&!win.isDestroyed())win.webContents.send('separation:progress',task)},undefined,scheduler)
const analysis=new AnalysisService(store,python,path.join(runtimeRoot,'worker/analyze.py'),task=>{if(win&&!win.isDestroyed())win.webContents.send('analysis:progress',task)},undefined,scheduler)
let quitReady=false,quitting=false
const shutdown=new ShutdownCoordinator(()=>{quitting=true;download?.abort();const task=separation.status();if(task)separation.cancel(task.id);const a=analysis.status();if(a)analysis.cancel(a.id)},()=>separation.busy||analysis.busy||!!download||ioTasks>0,()=>{quitReady=true;app.quit()})
let flushInProgress:Promise<void>|null=null
function flushRenderer():Promise<void>{
 if(!win||win.isDestroyed())return Promise.resolve()
 if(flushInProgress)return flushInProgress
 const window=win,token=randomUUID()
 flushInProgress=new Promise<void>((resolve,reject)=>{
  const finish=(error?:string)=>{clearTimeout(timer);ipcMain.removeListener('window:flushed',listener);window.removeListener('closed',closed);error?reject(new Error(error)):resolve()}
  const listener=(event:Electron.IpcMainEvent,value:unknown,error?:unknown)=>{if(event.sender===window.webContents&&value===token)finish(typeof error==='string'?error:undefined)}
  const closed=()=>finish()
  const timer=setTimeout(()=>finish('The window did not finish saving. Please try again.'),15000)
  ipcMain.on('window:flushed',listener);window.once('closed',closed);window.webContents.send('window:flush',token)
 }).finally(()=>{flushInProgress=null})
 return flushInProgress
}
let closeErrorVisible=false
async function showCloseError(error:unknown){
 if(closeErrorVisible)return
 closeErrorVisible=true
 try{
  const language=await store.settings().then(settings=>settings.language).catch(()=>app.getLocale().startsWith('zh')?'zh':'en')
  const copy=closeSaveFailure(error,language==='en')
  dialog.showErrorBox(copy.title,copy.message)
 }finally{closeErrorVisible=false}
}
app.on('before-quit',event=>{if(!quitReady){event.preventDefault();void flushRenderer().then(()=>shutdown.request()).catch(showCloseError)}})
const updates=new UpdateService(electronUpdater.autoUpdater,app.getVersion(),app.isPackaged,()=>separation.busy||analysis.busy||!!download||ioTasks>0,state=>{if(win&&!win.isDestroyed())win.webContents.send('updates:progress',state)})
handle('updates:status',()=>updates.status())
handle('updates:check',()=>updates.check())
handle('updates:download',()=>updates.download())
handle('updates:install',async()=>{await flushRenderer();return updates.install()})
handle('analysis:start',(projectId:string)=>analysis.start(projectId))
handle('analysis:status',()=>analysis.status())
handle('analysis:cancel',(id:string)=>analysis.cancel(id))
protocol.handle('printemps',async request=>{
 try {
  const u=new URL(request.url),[projectId,trackId]=u.pathname.split('/').filter(Boolean)
  if(u.hostname!=='audio'||request.method!=='GET')return new Response(null,{status:403})
  const project=await store.load(projectId),track=project.tracks.find(t=>t.id===trackId)
  if(!track)return new Response(null,{status:404})
  const response=await net.fetch(pathToFileURL(store.assetPath(project.id,track.assetId)).href)
  const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',process.env.ELECTRON_RENDERER_URL||'null')
  return new Response(response.body,{status:response.status,headers})
 }catch{return new Response(null,{status:404})}
})
function handle(channel:string,fn:(...args:any[])=>unknown){
 ipcMain.handle(channel,async(event,...args)=>{
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('Unauthorized request')
  if(quitting&&channel!=='projects:save')throw new Error('Application is finishing active tasks before quitting')
  if(updates.status().phase==='installing'&&channel!=='projects:save')throw new Error('Application is restarting to install an update')
  const tracked=['projects:import','projects:import-dropped','projects:save','tracks:edit','clips:edit','tracks:export','settings:save','settings:choose-directory','settings:reset-directory','projects:delete','projects:restore','projects:purge-archived'].includes(channel)
  if(tracked)ioTasks++
  try{return await fn(...args)}finally{if(tracked)ioTasks--}
 })
}
handle('projects:list',()=>store.list())
handle('projects:archived',()=>store.listArchived())
handle('projects:restore',(id:string)=>store.restoreArchived(id))
handle('projects:purge-archived',(id:string)=>store.purgeArchived(id))
handle('projects:open',(id:string)=>store.load(id))
handle('projects:save',async (id:string,input:unknown)=>{
 const edits=projectEditsSchema.parse(input)
 return store.update(id,current=>applyProjectEdits(current,edits))
})
handle('clips:edit',(id:string,input:unknown)=>store.update(id,p=>{if(separation.busy||exportingProjects.has(id))throw new Error('Wait for processing to finish before editing clips');return applyClipAction(p,clipActionSchema.parse(input),randomUUID)}))
handle('tracks:edit',async(id:string,input:unknown)=>{
 const action=trackActionSchema.parse(input)
 return store.update(id,current=>{
  if(action.kind==='delete'&&(separation.busy||analysis.busy||exportingProjects.has(id)))throw new Error('Wait for active tasks or export to finish before deleting a track')
  return applyTrackAction(current,action)
 })
})
handle('projects:delete',(id:string,purge:boolean)=>{if(separation.busy||analysis.busy||exportingProjects.has(id))throw new Error('Wait for active tasks or export to finish before deleting a project');return store.remove(id,purge===true)})
handle('tracks:export',async(id:string,trackIds:string[],format:'wav'|'flac',clipIds?:string[],options?:{alignment?:'clip'|'timeline'})=>{
 if(exportingProjects.has(id))throw new Error('This project is already being exported')
 exportingProjects.add(id)
 try{
 const plan=await prepareExport(store,id,trackIds,format,clipIds,options)
 const result=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory'],defaultPath:(await store.settings()).exportDirectory||undefined})
 if(result.canceled)return null
 const directory=result.filePaths[0]
 try{
  const files=await exportPreparedTracks(store,plan,directory)
  exportFolders.remember(files)
  return {count:files.length,directory}
 }catch(error){
  if(error instanceof PartialExportError){exportFolders.remember(error.files);return {count:error.files.length,directory,failure:{remainingIds:error.remainingIds,trackName:error.trackName,message:error.message}}}
  throw error
 }
 }finally{exportingProjects.delete(id)}
})
handle('exports:open-directory',async(directory:string)=>{
 const error=await shell.openPath(await exportFolders.resolve(directory))
 if(error)throw new Error(error)
})
let modelCache:ModelCache|null=null
let modelBase=''
let download:AbortController|null=null
// Model downloads run on their own session so the proxy preference applies to them and nothing else.
const downloadSession=session.fromPartition('printemps-downloads',{cache:false})
let proxySettings:Pick<Settings,'proxyMode'|'proxyUrl'>={proxyMode:'system',proxyUrl:''}
async function applyProxy(){const settings=await store.settings();proxySettings={proxyMode:settings.proxyMode,proxyUrl:settings.proxyUrl};await downloadSession.setProxy(proxyConfig(proxySettings))}
const downloadFetcher=createDownloadFetcher(options=>net.request({...options,session:downloadSession}),()=>proxyCredentials(proxySettings))
await applyProxy()
// Restore the user's interpreter, but fall back to the bundled one if it has since disappeared.
{const saved=(await store.settings()).pythonPath;if(saved){try{await fsPromises.access(saved,fsConstants.X_OK);interpreter=saved}catch{interpreter=python}}}
async function models(){
 const settings=await store.settings(),directory=settings.modelDirectory||path.join(store.root,'models')
 const base=modelBaseUrl(settings.hfEndpoint)
 if(!modelCache||modelCache.directory!==directory||modelBase!==base){if(download||separation.busy)throw new Error('Wait for active task to finish');modelBase=base;modelCache=new ModelCache(directory,undefined,base,downloadFetcher as unknown as typeof fetch)}
 return modelCache
}
handle('models:list',async()=> (await models()).list())
handle('models:download',async(id:string)=>{
 if(download||separation.busy)throw new Error('Another model task is running')
 const cache=await models();if(download||separation.busy)throw new Error('Another model task is running')
 const controller=new AbortController();download=controller
 try{await cache.ensure(id,controller.signal,p=>{if(!win.isDestroyed())win.webContents.send('models:progress',p)})}
 finally{download=null}
})
handle('models:cancel',()=>{download?.abort()})
handle('models:delete',async(id:string)=>{const cache=await models();if(separation.busy||download)throw new Error('Model is in use');return cache.remove(id)})
handle('separation:start',async(projectId:string,sourceId:string,ids:string[],clipId?:string)=>{
 const cache=await models(),settings=await store.settings()
 if(download)throw new Error('Wait for model download to finish')
 return separation.start(projectId,sourceId,ids,cache,settings.device,clipId)
})
handle('separation:status',()=>separation.status())
handle('separation:cancel',(id:string)=>separation.cancel(id))
handle('settings:get',()=>store.settings())
let deviceProbe:Promise<Probe>|null=null
handle('device:probe',()=>{deviceProbe??=probeInterpreter(interpreter).catch(e=>{deviceProbe=null;throw e});return deviceProbe})
const settingsService=new SettingsService(store,()=>!!download||separation.busy)
handle('settings:save',async(value)=>{const saved=await settingsService.save(value);await applyProxy();return saved})
handle('settings:directories',()=>settingsService.directories())
handle('settings:reset-directory',(kind:DirectoryKind)=>settingsService.setDirectory(kind,''))
handle('settings:choose-python',async()=>{
 if(separation.busy)throw new Error('Wait for the separation to finish before changing the interpreter')
 const result=await dialog.showOpenDialog(win,{properties:['openFile'],defaultPath:(await store.settings()).pythonPath||undefined})
 if(result.canceled)return null
 const candidate=result.filePaths[0]
 const probe=await probeInterpreter(candidate).catch(e=>{throw new Error(`Cannot run this interpreter: ${e instanceof Error?e.message:String(e)}`)})
 if(probe.missing.length)throw new Error(`This environment is missing ${probe.missing.join(', ')}. Install them with pip, then choose it again.`)
 const saved=await settingsService.setPythonPath(candidate)
 interpreter=saved.pythonPath||python;deviceProbe=null
 return saved
})
handle('settings:reset-python',async()=>{
 if(separation.busy)throw new Error('Wait for the separation to finish before changing the interpreter')
 const saved=await settingsService.setPythonPath('')
 interpreter=python;deviceProbe=null
 return saved
})
handle('settings:choose-directory',async(kind:DirectoryKind)=>{
 if(!['modelDirectory','exportDirectory'].includes(kind))throw new Error('Invalid directory type')
 if(kind==='modelDirectory'&&(download||separation.busy))throw new Error('Wait for model tasks to finish')
 const folders=await settingsService.directories()
 const result=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory'],defaultPath:folders[kind]||undefined})
 if(result.canceled)return null
 return settingsService.setDirectory(kind,result.filePaths[0])
})
const importer=new AudioImporter(store)
handle('projects:import',async()=>{
 const result=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Audio',extensions:['wav','flac','mp3','m4a','aiff','aif','ogg']}]})
 if(result.canceled||result.filePaths.length!==1)return null
 return importer.import(result.filePaths[0])
})
handle('projects:import-dropped',(source:string)=>importer.import(source))
const syncMenu=installNativeMenu(command=>{if(win&&!win.isDestroyed())win.webContents.send('menu:command',command)})
handle('menu:state',state=>{syncMenu(menuStateSchema.parse(state))})
function createWindow(){
 syncMenu()
 win=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:700,backgroundColor:'#14171b',title:'Printemps',titleBarStyle:'hidden',titleBarOverlay:process.platform==='darwin'?true:{color:'#101216',symbolColor:'#a0aab8',height:66},...(process.platform==='darwin'?{trafficLightPosition:{x:20,y:27}}:{}),webPreferences:{preload:path.join(here,'../preload/index.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}})
 let closeReady=false
 const window=win
 window.on('closed',()=>syncMenu())
 window.on('close',event=>{if(quitReady||closeReady)return;event.preventDefault();void flushRenderer().then(()=>{if(!window.isDestroyed()){closeReady=true;window.close()}}).catch(showCloseError)})
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}))
 win.webContents.on('will-navigate',(event)=>event.preventDefault())
 if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(process.env.ELECTRON_RENDERER_URL)
 else void win.loadFile(path.join(here,'../renderer/index.html'))
}
createWindow()
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})
app.on('browser-window-blur',(_event,window)=>{if(process.platform==='darwin'&&!window.isDestroyed())window.setWindowButtonVisibility(true)})
app.on('browser-window-focus',(_event,window)=>{if(process.platform==='darwin'&&!window.isDestroyed())window.setWindowButtonVisibility(true)})
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})

}).catch(error => { console.error(error); app.quit() })
