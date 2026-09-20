import {test,expect} from 'vitest'
import {beatGrid,formatPosition,rulerTicks} from '../src/shared/timeline'
test('timeline respects beat offset, compound meter and large-file grid bounds',()=>{
 const music={bpm:120,key:null,meter:'6/8' as const,firstBeat:2}
 expect(formatPosition(1,music,'beats')).toBe('—')
 expect(formatPosition(3.5,music,'beats')).toBe('2.1')
 expect(formatPosition(3661,music,'time')).toBe('01:01:01')
 expect(beatGrid(3.5,music).map(x=>x.seconds)).toEqual([2,2.25,2.5,2.75,3,3.25,3.5])
 expect(beatGrid(36000,music).length).toBeLessThanOrEqual(300)
 expect(beatGrid(1,music)).toEqual([])
 expect(beatGrid(10,{...music,bpm:null})).toEqual([])
})
test('musical ruler labels align with real downbeats instead of rounded arbitrary times',()=>{
 const music={bpm:100,key:null,meter:'6/8' as const,firstBeat:0.5}
 const ticks=rulerTicks(16,music,'beats')
 expect(ticks.map(x=>x.label)).toEqual(['1.1','3.1','5.1','7.1','9.1'])
 ticks.forEach((tick,i)=>expect(tick.seconds).toBeCloseTo(0.5+i*3.6))
 expect(rulerTicks(0.1,music,'beats')).toEqual([])
 expect(rulerTicks(36000,music,'beats').length).toBeLessThanOrEqual(7)
 expect(rulerTicks(16,{...music,bpm:null},'beats')).toEqual(rulerTicks(16,music,'time'))
})
