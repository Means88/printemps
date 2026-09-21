import type { Project, Settings } from './domain'
import type {ProjectEdits} from './project-edits'
export type SeparationTask={id:string;projectId:string;sourceId:string;clipId?:string;failurePhase?:'downloading'|'separating';downloadModels?:{id:string;received:number;total:number;ready:boolean}[];phase:'waiting'|'downloading'|'separating'|'complete'|'cancelled'|'failed';progress:number;stem?:string;targets?:string[];completedStems?:number;retrySourceId?:string;remainingTargets?:string[];error?:string}
export type AnalysisTask={id:string;projectId:string;phase:'waiting'|'analyzing'|'complete'|'cancelled'|'failed';stage:'beats'|'key';error?:string}
export type UpdateState={phase:'development'|'idle'|'checking'|'available'|'current'|'downloading'|'ready'|'installing'|'error';currentVersion:string;version?:string;percent?:number;transferred?:number;total?:number;error?:string}
export interface DesktopAPI {
 readonly platform: string
  onMenuCommand(callback:(command:import('./native-menu').MenuCommand)=>void):()=>void
  syncMenu(state:import('./native-menu').MenuState):Promise<void>
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
  startSeparation(projectId:string,sourceId:string,targets:string[],clipId?:string):Promise<SeparationTask>
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
  editClip(id:string,action:import('./clips').ClipAction):Promise<Project>
  editTrack(id:string,action:import('./track-actions').TrackAction):Promise<Project>
  deleteProject(id: string, purge: boolean): Promise<void>
  exportTracks(projectId:string, trackIds:string[], format:'wav'|'flac',clipIds?:string[],options?:{alignment?:'clip'|'timeline'}): Promise<{count:number;directory:string;failure?:{remainingIds:string[];trackName:string;message:string}}|null>
  openExportDirectory(directory:string):Promise<void>
  listModels(): Promise<{id:string;bytes:number;cached:boolean}[]>
  downloadModel(id:string): Promise<void>
  cancelModelDownload(): Promise<void>
  deleteModel(id:string): Promise<void>
  onModelProgress(callback:(progress:{modelId:string;received:number;total:number})=>void):()=>void
  getSettings(): Promise<Settings>
  probeDevice(): Promise<DeviceProbe>
  saveSettings(settings: Partial<Pick<Settings,'language'|'device'|'proxyMode'|'proxyUrl'|'hfEndpoint'>>): Promise<Settings>
  settingsDirectories():Promise<{modelDirectory:string;exportDirectory:string}>
  chooseSettingsDirectory(kind:'modelDirectory'|'exportDirectory'):Promise<Settings|null>
  resetSettingsDirectory(kind:'modelDirectory'|'exportDirectory'):Promise<Settings>
  /** Opens a section of the online guide in the default browser. The topic is a fixed key, not a URL. */
  openDocumentation(topic:'inference-environment'):Promise<void>
  /** Writes a redacted report of this session's failures to a file the user picks. Returns null if cancelled. */
  exportDiagnostics():Promise<string|null>
  choosePythonInterpreter():Promise<Settings|null>
  resetPythonInterpreter():Promise<Settings>
}
declare global { interface Window { printemps: DesktopAPI } }

/** `backend` distinguishes an NVIDIA build from a ROCm one; both expose AMD/NVIDIA GPUs as `cuda`. */
export interface DeviceProbe{cuda:boolean;mps:boolean;auto:'cuda'|'cpu';torch:string;backend:''|'cuda'|'rocm';missing:string[];custom:boolean}
