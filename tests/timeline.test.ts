import {test,expect} from 'vitest'
import {beatGrid,formatPosition} from '../src/shared/timeline'
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
