import {test,expect} from 'vitest'
import manifest from '../src/shared/model-manifest.json'
import {stemColor,stemLabel,matchesStem,stemPresets,addStemSelection,formatModelBytes} from '../src/shared/stems'
test('all 53 pinned models have translated labels and presets reference actual models',()=>{
 const ids=manifest.models.map(m=>m.id)
 expect(ids).toHaveLength(53)
 expect(new Set(ids.map(stemColor)).size).toBe(53)
 for(const id of ids){expect(stemColor(id)).toMatch(/^#[\da-f]{6}$/);expect(stemColor(id)).not.toBe(stemColor('other'))}
 for(const id of ids){expect(stemLabel(id)).toMatch(/[\u4e00-\u9fff]/);expect(stemLabel(id,true)).toMatch(/[a-z]/i)}
 for(const preset of stemPresets)for(const id of preset.stems)expect(ids).toContain(id)
 expect(matchesStem('lead-vocal','主唱','voice')).toBe(true)
 expect(matchesStem('lead-vocal','LEAD VOC','voice')).toBe(true)
 expect(matchesStem('lead-vocal','主唱','rhythm')).toBe(false)
 expect(matchesStem('hh','hi-hat')).toBe(true)
 expect(addStemSelection(['piano','vocal'],['vocal','drums'])).toEqual(['piano','vocal','drums'])
 expect(formatModelBytes(77616988)).toBe('77.6 MB')
})
