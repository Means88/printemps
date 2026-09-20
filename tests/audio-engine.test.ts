import {afterEach,beforeEach,expect,test,vi} from 'vitest'
import {AudioEngine} from '../src/renderer/audio-engine'
import type {Project,Track} from '../src/shared/domain'

class Node {
 gain={value:1,setTargetAtTime:vi.fn(),setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()}
 connect=vi.fn(()=>this)
 disconnect=vi.fn()
 start=vi.fn()
 stop=vi.fn()
 onended:(()=>void)|null=null
 buffer:unknown
 loop=false
 loopStart=0
 loopEnd=0
}
class Context {
 static current:Context
 currentTime=0
 destination=new Node()
 voices:Node[]=[]
 gains:Node[]=[]
 constructor(){Context.current=this}
 createGain(){const gain=new Node();this.gains.push(gain);return gain}
 createBufferSource(){const voice=new Node();this.voices.push(voice);return voice}
 decodeAudioData=vi.fn(async()=>({duration:10}))
 resume=vi.fn(async()=>{})
 close=vi.fn(async()=>{})
}
const track=(id:string,role:Track['role']='stem'):Track=>({id,assetId:id,name:id,role,stem:id,color:'#abc',gain:0,muted:false,solo:false,peaks:[],duration:10,sampleRate:44100,channels:2})
const project=(tracks:Track[],id='song'):Project=>({id,tracks,schemaVersion:1,name:id,sourceName:'input.wav',createdAt:'',updatedAt:'',music:{bpm:null,key:null,meter:'4/4',firstBeat:0},recommendation:null,metronome:false,clickGain:-12,timeFormat:'time',monitor:'stems',masterGain:0})
let engine:AudioEngine
beforeEach(()=>{
 vi.useFakeTimers();vi.stubGlobal('AudioContext',Context)
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ArrayBuffer(8))))
 engine=new AudioEngine()
})
afterEach(async()=>{await engine.dispose();vi.unstubAllGlobals();vi.useRealTimers()})
function deferDecode(){let finish!:(buffer:{duration:number})=>void;Context.current.decodeAudioData.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));return()=>finish({duration:10})}
async function waitForDecode(count:number){await vi.waitFor(()=>expect(Context.current.decodeAudioData).toHaveBeenCalledTimes(count))}

test('progressive results keep existing voices running and join at the current clock position',async()=>{
 const original=track('original','original'),a=track('a'),b=track('b')
 await engine.load(project([original,a]));await engine.play()
 const context=Context.current,old=[...context.voices]
 context.currentTime=2
 const finish=deferDecode(),loading=engine.load(project([original,a,b]))
 await waitForDecode(3)
 expect(engine.playing).toBe(true);for(const voice of old)expect(voice.stop).not.toHaveBeenCalled()
 context.currentTime=3;finish();await loading
 expect(context.voices).toHaveLength(3)
 expect(context.voices[2].start).toHaveBeenCalledWith(3.025,3)
 expect(engine.position).toBeCloseTo(2.975)
 for(const voice of old)expect(voice.stop).not.toHaveBeenCalled()
})

test('secondary replacement switches only replaced voices and respects loop wrap',async()=>{
 const original=track('original','original'),a=track('a')
 await engine.load(project([original,a]));await engine.setLoop({start:2,end:4});await engine.play()
 const context=Context.current,[originalVoice,replacedVoice]=context.voices
 context.currentTime=2.01
 await engine.load(project([original,track('other','other'),track('b')]))
 expect(originalVoice.stop).not.toHaveBeenCalled()
 expect(replacedVoice.stop.mock.calls[0][0]).toBeCloseTo(2.035)
 for(const voice of context.voices.slice(2)){
  expect(voice.start.mock.calls[0][0]).toBeCloseTo(2.035)
  expect(voice.start.mock.calls[0][1]).toBeCloseTo(2.01)
  expect([voice.loop,voice.loopStart,voice.loopEnd]).toEqual([true,2,4])
 }
 engine.pause()
 expect(replacedVoice.stop).toHaveBeenLastCalledWith()
 expect(replacedVoice.disconnect).toHaveBeenCalled()
})

test('pause during decoding stays paused and obsolete results cannot restore an unloaded project',async()=>{
 const original=track('original','original')
 await engine.load(project([original]));await engine.play()
 let finish=deferDecode(),loading=engine.load(project([original,track('b')]))
 await waitForDecode(2);engine.pause();finish();await loading
 expect(engine.playing).toBe(false);expect(Context.current.voices).toHaveLength(1)
 finish=deferDecode();loading=engine.load(project([original,track('b'),track('c')]))
 await waitForDecode(3);engine.unload();finish();await loading
 expect(engine.duration).toBe(0);expect(engine.position).toBe(0)
 await engine.play();expect(engine.playing).toBe(false)
})

test('failed decoding leaves current playback intact; switching projects stops old voices',async()=>{
 const original=track('original','original')
 await engine.load(project([original]));await engine.play()
 const voice=Context.current.voices[0]
 Context.current.decodeAudioData.mockRejectedValueOnce(new Error('Corrupt audio'))
 await expect(engine.load(project([original,track('broken')]))).rejects.toThrow('Corrupt audio')
 expect(engine.playing).toBe(true);expect(voice.stop).not.toHaveBeenCalled()
 await engine.load(project([track('next','original')],'next-project'))
 expect(engine.playing).toBe(false);expect(engine.position).toBe(0)
 expect(voice.stop).toHaveBeenCalled()
})

test('automatic first-stem monitoring waits for decoding before muting the original',async()=>{
 const original=track('original','original')
 await engine.load({...project([original]),monitor:'original'});await engine.play()
 const context=Context.current,originalGain=context.gains[1]
 const next=project([original,track('b')]),finish=deferDecode(),loading=engine.load(next)
 engine.applyMix(next);await waitForDecode(2)
 expect(originalGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(1,0,.008)
 context.currentTime=1;finish();await loading
 expect(originalGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0,1.025,.008)
 expect(context.voices[1].start.mock.calls[0][0]).toBeCloseTo(1.025)
 expect(context.voices[1].start.mock.calls[0][1]).toBeCloseTo(1)
})
