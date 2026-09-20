import type { Project, Settings } from './domain'
import type {ProjectEdits} from './project-edits'
export type SeparationTask={id:string;projectId:string;sourceId:string;phase:'waiting'|'downloading'|'separating'|'complete'|'cancelled'|'failed';progress:number;stem?:string;targets?:string[];completedStems?:number;retrySourceId?:string;remainingTargets?:string[];error?:string}
export type AnalysisTask={id:string;projectId:string;phase:'waiting'|'analyzing'|'complete'|'cancelled'|'failed';stage:'beats'|'key';error?:string}
export type UpdateState={phase:'development'|'idle'|'checking'|'available'|'current'|'downloading'|'ready'|'installing'|'error';currentVersion:string;version?:string;percent?:number;transferred?:number;total?:number;error?:string}
export interface DesktopAPI {
  onCloseRequest(callback:()=>Promise<void>):()=>void
  updateStatus():Promise<UpdateState>
  checkForUpdates():Promise<UpdateState>
  downloadUpdate():Promise<UpdateState>
  installUpdate():Promise<void>
  onUpdate(callback:(state:UpdateState)=>void):()=>void
  startAnalysis(projectId:string):Promise<AnalysisTask>
  analysisStatus():Promise<AnalysisTask|null>
  cancelAnalysis(id:string):Promise<void>
  onAnalysis(callback:(task:AnalysisTask)=>void):()=>void
  startSeparation(projectId:string,sourceId:string,targets:string[]):Promise<SeparationTask>
  separationStatus():Promise<SeparationTask|null>
  cancelSeparation(id:string):Promise<void>
  onSeparation(callback:(task:SeparationTask)=>void):()=>void
  listArchivedProjects():Promise<{archiveId:string;project:Project}[]>
  restoreArchivedProject(archiveId:string):Promise<Project>
  purgeArchivedProject(archiveId:string):Promise<void>
  listProjects(): Promise<Project[]>
  openProject(id: string): Promise<Project>
  importDroppedAudio(file:File):Promise<Project>
  importAudio(): Promise<Project | null>
  saveProject(id:string,edits:ProjectEdits): Promise<Project>
  deleteProject(id: string, purge: boolean): Promise<void>
  exportTracks(projectId:string, trackIds:string[], format:'wav'|'flac'): Promise<{count:number;directory:string;failure?:{remainingIds:string[];trackName:string;message:string}}|null>
  listModels(): Promise<{id:string;bytes:number;cached:boolean}[]>
  downloadModel(id:string): Promise<void>
  cancelModelDownload(): Promise<void>
  deleteModel(id:string): Promise<void>
  onModelProgress(callback:(progress:{modelId:string;received:number;total:number})=>void):()=>void
  getSettings(): Promise<Settings>
  saveSettings(settings: Partial<Pick<Settings,'language'|'device'>>): Promise<Settings>
  settingsDirectories():Promise<{modelDirectory:string;exportDirectory:string}>
  chooseSettingsDirectory(kind:'modelDirectory'|'exportDirectory'):Promise<Settings|null>
  resetSettingsDirectory(kind:'modelDirectory'|'exportDirectory'):Promise<Settings>
}
declare global { interface Window { printemps: DesktopAPI } }
