import {playbackPosition,validateLoop,clickEvents,type LoopRange} from '../shared/playback'
import { audibleTracks, type Project, type Track } from '../shared/domain'
type Voice={source:AudioBufferSourceNode;gain:GainNode}
/** Every source is scheduled on one AudioContext clock, including the metronome. */
export class AudioEngine {
 private context = new AudioContext()
 private master = this.context.createGain()
 private buffers = new Map<string, AudioBuffer>()
 private sources = new Map<string, Voice>()
 private retiring = new Set<Voice>()
 private clickSources = new Set<OscillatorNode>()
 private project: Project | null = null
 private offset = 0
 private started = 0
 private running = false
 private generation = 0
 private playbackGeneration = 0
 private timer: ReturnType<typeof setInterval> | undefined
 private clickUntil = 0
 private loop:LoopRange|null=null
 constructor(){this.master.connect(this.context.destination)}
 get playing(){return this.running}
 get duration(){return this.project?.tracks[0]?.duration ?? 0}
 get position(){return playbackPosition(this.running?this.context.currentTime-this.started:0,this.offset,this.duration,this.loop)}
 async setLoop(range:LoopRange|null){validateLoop(range,this.duration);const playing=this.running;this.pause();this.loop=range;if(range&&(this.offset<range.start||this.offset>=range.end))this.offset=range.start;if(playing)await this.play()}
 async load(project:Project){
  const sameProject=this.project?.id===project.id
  if(!sameProject){this.pause();this.offset=0;this.loop=null;this.buffers.clear()}
  const generation=++this.generation;this.project=project
  const buffers=await Promise.all(project.tracks.map(async t=>{
   const key=`${project.id}/${t.id}`
   const cached=this.buffers.get(key)
   if(cached)return [key,cached] as const
   const response=await fetch(`printemps://audio/${key}`)
   if(!response.ok)throw new Error(`Audio unavailable: ${t.name}`)
   return [key,await this.context.decodeAudioData(await response.arrayBuffer())] as const
  }))
  if(generation!==this.generation)return
  this.buffers=new Map(buffers)
  // Decode new results while existing voices keep playing. Replace only changed
  // voices at one future audio-clock boundary, using the current seek/loop state.
  let mixAt=this.context.currentTime
  if(this.running){
   const at=this.context.currentTime+.025
   mixAt=at
   const position=playbackPosition(at-this.started,this.offset,this.duration,this.loop)
   const ids=new Set(project.tracks.map(t=>t.id))
   for(const [id,voice] of this.sources){if(!ids.has(id)){
    this.sources.delete(id);this.retiring.add(voice)
    voice.source.onended=()=>{voice.source.disconnect();voice.gain.disconnect();this.retiring.delete(voice)}
    voice.source.stop(at)
   }}
   if(this.loop||position<this.duration){
    const current=this.project??project,audible=new Set(audibleTracks(current).map(t=>t.id))
    for(const track of current.tracks)if(!this.sources.has(track.id))this.startVoice(track,at,position,audible.has(track.id))
   }
  }
  this.applyMix(this.project??project,mixAt)
 }
 applyMix(project:Project,at=this.context.currentTime){
  const previous=this.project;this.project=project
  this.master.gain.setTargetAtTime(Math.pow(10,project.masterGain/20),at,.008)
  // The first result may switch monitoring before its audio has decoded.
  // Keep the original audible until that result can join the clock.
  const waitingForFirstStem=project.monitor==='stems'&&!project.tracks.some(t=>t.role!=='original'&&this.buffers.has(`${project.id}/${t.id}`))
  const audible=new Set(audibleTracks(waitingForFirstStem?{...project,monitor:'original'}:project).map(t=>t.id))
  for(const t of project.tracks){const node=this.sources.get(t.id);if(node)node.gain.gain.setTargetAtTime(audible.has(t.id)?Math.pow(10,t.gain/20):0,at,.008)}
  if(previous && (JSON.stringify(previous.music)!==JSON.stringify(project.music)||previous.metronome!==project.metronome))this.resetClicks()
 }
 async play(){
  if(this.running||!this.project)return
  const generation=++this.playbackGeneration
  await this.context.resume()
  if(generation!==this.playbackGeneration||this.running||!this.project)return
  if(this.offset>=this.duration)this.offset=0
  if(this.loop&&(this.offset<this.loop.start||this.offset>=this.loop.end))this.offset=this.loop.start
  const start=this.context.currentTime+.025
  this.started=start;this.running=true
  const audible=new Set(audibleTracks(this.project).map(t=>t.id))
  for(const t of this.project.tracks)this.startVoice(t,start,this.offset,audible.has(t.id))
  this.resetClicks();this.timer=setInterval(()=>this.tick(),25)
 }
 private startVoice(track:Track,at:number,position:number,audible:boolean){
  const buffer=this.buffers.get(`${this.project?.id}/${track.id}`);if(!buffer)return
  const source=this.context.createBufferSource(),gain=this.context.createGain()
  source.buffer=buffer;if(this.loop){source.loop=true;source.loopStart=this.loop.start;source.loopEnd=this.loop.end}
  gain.gain.value=audible?Math.pow(10,track.gain/20):0
  source.connect(gain).connect(this.master);source.start(at,position)
  this.sources.set(track.id,{source,gain})
 }
 pause(){
  this.playbackGeneration++
  const at=this.position;this.running=false;this.offset=Math.max(0,at)
  for(const {source,gain} of [...this.sources.values(),...this.retiring]){try{source.stop()}catch{}source.disconnect();gain.disconnect()}
  this.sources.clear();this.retiring.clear();if(this.timer)clearInterval(this.timer);this.timer=undefined
  for(const oscillator of this.clickSources){try{oscillator.stop()}catch{}oscillator.disconnect()}
  this.clickSources.clear()
 }
 async seek(seconds:number){const playing=this.running;this.pause();this.offset=Math.max(0,Math.min(seconds,this.duration));if(this.loop&&(this.offset<this.loop.start||this.offset>=this.loop.end))this.offset=this.loop.start;if(playing)await this.play()}
 private resetClicks(){
  for(const oscillator of this.clickSources){try{oscillator.stop()}catch{}}
  this.clickSources.clear()
  this.clickUntil=Math.max(this.context.currentTime,this.started)
 }
 private tick(){
  if(!this.running||!this.project)return
  if(!this.loop&&this.position>=this.duration){this.pause();return}
  const {music,metronome,clickGain}=this.project
  if(!metronome||!music.bpm)return
  const denominator=Number(music.meter.split('/')[1]),until=this.context.currentTime+.1
  const events=clickEvents(Math.max(this.context.currentTime,this.started,this.clickUntil),until,music,at=>playbackPosition(at-this.started,this.offset,this.duration,this.loop),this.duration,this.loop)
  this.clickUntil=until
  for(const {at,beat} of events){
   const osc=this.context.createOscillator(),gain=this.context.createGain()
   osc.frequency.value=beat===0?1500:denominator===8&&beat%3===0?1100:800
   gain.gain.setValueAtTime(Math.pow(10,clickGain/20)*.3,at)
   gain.gain.exponentialRampToValueAtTime(.0001,at+.035)
   osc.connect(gain).connect(this.master);osc.start(at);osc.stop(at+.04)
   this.clickSources.add(osc);osc.onended=()=>{this.clickSources.delete(osc);osc.disconnect();gain.disconnect()}
  }
 }
 unload(){this.generation++;this.pause();this.project=null;this.buffers.clear();this.offset=0;this.loop=null}
 async dispose(){this.generation++;this.pause();this.buffers.clear();await this.context.close()}
}
