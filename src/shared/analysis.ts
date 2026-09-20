import { z } from 'zod'
import type { Musical } from './domain'
export const analysisResultSchema=z.object({
 type:z.literal('complete'),beats:z.array(z.number().finite().nonnegative()).max(200000),downbeats:z.array(z.number().finite().nonnegative()).max(200000),
 errors:z.object({beats:z.string().optional(),key:z.string().optional()}).optional(),
 key:z.string().nullable(),strength:z.number().finite().min(-1).max(1).nullable()
})
export type AnalysisResult=z.infer<typeof analysisResultSchema>
export type AnalysisWarning='insufficient_beats'|'variable_tempo'|'uncertain_meter'|'quarter_note_assumption'|'uncertain_key'
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2}
export function summarizeAnalysis(input:AnalysisResult,duration:number){
 const result=analysisResultSchema.parse(input),recommendation:Partial<Musical>={},warnings:AnalysisWarning[]=[]
 for(const times of [result.beats,result.downbeats])if(times.some((time,i)=>time>duration||i>0&&time<=times[i-1]))throw new Error('Invalid analysis timing')
 const intervals=result.beats.slice(1).map((time,i)=>time-result.beats[i])
 if(intervals.length>=7){
  const interval=median(intervals),bpm=60/interval
  const deviation=intervals.filter(value=>Math.abs(value-interval)>interval*.12).length/intervals.length
  if(bpm>=20&&bpm<=400&&deviation<=.15)recommendation.bpm=Math.round(bpm*10)/10
  else warnings.push('variable_tempo')
 }else warnings.push('insufficient_beats')
 // Beat This predicts pulses, not their notated denominator. Treat stable pulse counts
 // as a quarter-note hypothesis, never infer compound meters from a two-pulse bar.
 let beatIndex=0
 const downIndices=result.downbeats.map(time=>{
  while(beatIndex+1<result.beats.length&&Math.abs(result.beats[beatIndex+1]-time)<Math.abs(result.beats[beatIndex]-time))beatIndex++
  return Math.abs(result.beats[beatIndex]-time)<=.07?beatIndex:-1
 })
 const counts=downIndices.slice(1).map((index,i)=>index>=0&&downIndices[i]>=0?index-downIndices[i]:0)
 const countsMap=new Map<number,number>();counts.forEach(count=>countsMap.set(count,(countsMap.get(count)||0)+1))
 const best=[...countsMap].sort((a,b)=>b[1]-a[1])[0]
 if(counts.length>=3&&best&&best[1]/counts.length>=.8&&[3,4,5].includes(best[0])&&recommendation.bpm){
  recommendation.meter=`${best[0]}/4` as Musical['meter'];recommendation.firstBeat=result.downbeats[0];warnings.push('quarter_note_assumption')
 }else warnings.push('uncertain_meter')
 const enharmonics:Record<string,string>={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'}
 const key=result.key?.match(/^([A-G](?:#|b)?) (major|minor)$/)
 if(key&&result.strength!==null&&result.strength>=.6)recommendation.key=`${enharmonics[key[1]]||key[1]} ${key[2]}`
 else warnings.push('uncertain_key')
 return {recommendation,warnings}
}
