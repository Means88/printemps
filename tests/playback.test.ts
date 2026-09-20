import {test,expect} from 'vitest'
import {playbackPosition,clickEvents,validateLoop} from '../src/shared/playback'
test('native-loop clock wraps without losing elapsed overshoot and clamps scheduled startup',()=>{
 const loop={start:2,end:4}
 expect(playbackPosition(2.25,2,10,loop)).toBe(2.25)
 expect(playbackPosition(20.25,2,10,loop)).toBe(2.25)
 expect(playbackPosition(-.025,2,10,loop)).toBe(2)
 expect(playbackPosition(12,0,10,null)).toBe(10)
 expect(()=>validateLoop({start:2,end:2},10)).toThrow()
 expect(()=>validateLoop({start:0,end:Infinity},10)).toThrow()
})
test('metronome scheduling respects loop boundaries and does not duplicate horizon-edge clicks',()=>{
 const music={bpm:120,meter:'4/4' as const,key:null,firstBeat:0},loop={start:1,end:2}
 const position=(at:number)=>playbackPosition(at,0,10,loop)
 expect(clickEvents(1.95,2.1,music,position,10,loop)).toEqual([{at:2,beat:2}])
 expect(clickEvents(0,.5,music,at=>at,10,null)).toEqual([{at:0,beat:0}])
 expect(clickEvents(.5,1,music,at=>at,10,null)).toEqual([{at:.5,beat:1}])
 expect(clickEvents(0,.1,{...music,firstBeat:1},at=>at,10,null)).toEqual([])
 expect(clickEvents(0,1,{...music,bpm:null},at=>at,10,null)).toEqual([])
})
