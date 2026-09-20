import {test,expect} from 'vitest'
import {matchesProject} from '../src/shared/project-search'
import type {Project} from '../src/shared/domain'

test('history search finds renamed stems in either language and preserves filename/name matching',()=>{
 const project={name:'Evening Session',sourceName:'Demo.WAV',tracks:[{name:'Custom low end',stem:'bass'},{name:'Custom harmony',stem:'back-vocal'}]} as Project
 for(const query of [' 贝斯 ','BASS','和声','Backing vocals','Custom low','demo.wav','evening'])expect(matchesProject(project,query)).toBe(true)
 expect(matchesProject(project,'Piano')).toBe(false)
 expect(matchesProject(project,'  ')).toBe(true)
})

test('finds projects by renamed clips, including retained hidden source clips',()=>{
 const project={name:'Session',sourceName:'source.wav',tracks:[{name:'Lead vocal',stem:'lead-vocal',clips:[{name:'副歌第二段'},{name:'Quiet Bridge'},{name:'保留来源',hidden:true}]}]} as Project
 for(const query of ['副歌','第二段',' quiet BRIDGE ','保留来源'])expect(matchesProject(project,query)).toBe(true)
 expect(matchesProject(project,'Deleted excerpt')).toBe(false)
 project.tracks[0].clips=project.tracks[0].clips!.filter(clip=>clip.name!=='Quiet Bridge')
 expect(matchesProject(project,'quiet bridge')).toBe(false)
})
