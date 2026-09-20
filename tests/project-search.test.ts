import {test,expect} from 'vitest'
import {matchesProject} from '../src/shared/project-search'
import type {Project} from '../src/shared/domain'

test('history search finds renamed stems in either language and preserves filename/name matching',()=>{
 const project={name:'Evening Session',sourceName:'Demo.WAV',tracks:[{name:'Custom low end',stem:'bass'},{name:'Custom harmony',stem:'back-vocal'}]} as Project
 for(const query of [' 贝斯 ','BASS','和声','Backing vocals','Custom low','demo.wav','evening'])expect(matchesProject(project,query)).toBe(true)
 expect(matchesProject(project,'Piano')).toBe(false)
 expect(matchesProject(project,'  ')).toBe(true)
})
