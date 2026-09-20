import {test,expect} from 'vitest'
import {summarizeAnalysis,type AnalysisResult} from '../src/shared/analysis'
const steady=():AnalysisResult=>({type:'complete',beats:Array.from({length:32},(_,i)=>.1+i*.5),downbeats:Array.from({length:8},(_,i)=>.1+i*2),key:'Db major',strength:.85})
test('derives tempo and meter from beat evidence, normalizes key and marks beat-unit assumption',()=>{
 const result=summarizeAnalysis(steady(),16)
 expect(result.recommendation).toEqual({bpm:120,meter:'4/4',firstBeat:.1,key:'C# major'})
 expect(result.warnings).toEqual(['quarter_note_assumption'])
})
test('does not invent default meter, key or tempo from sparse or uncertain results',()=>{
 const result=summarizeAnalysis({type:'complete',beats:[0,.5],downbeats:[0],key:'C major',strength:.2},1)
 expect(result.recommendation).toEqual({})
 expect(result.warnings).toContain('insufficient_beats');expect(result.warnings).toContain('uncertain_meter')
 const uncertain=steady();uncertain.downbeats=[.1,2.1,3.6,5.6,7.1];uncertain.beats=uncertain.beats.map((_,i)=>i<16?.1+i*.5:8.1+(i-16)*.75)
 expect(summarizeAnalysis(uncertain,30).recommendation.bpm).toBeUndefined()
 const compound=steady();compound.downbeats=compound.beats.filter((_,i)=>i%2===0)
 expect(summarizeAnalysis(compound,16).recommendation.meter).toBeUndefined()
})
test('rejects malformed worker timestamps rather than storing invalid recommendations',()=>{
 const result=steady();result.beats[1]=result.beats[0]
 expect(()=>summarizeAnalysis(result,16)).toThrow('Invalid analysis timing')
 expect(()=>summarizeAnalysis(steady(),1)).toThrow('Invalid analysis timing')
})
