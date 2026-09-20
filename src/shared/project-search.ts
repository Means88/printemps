import type {Project} from './domain'
import {stemLabel} from './stems'

export function matchesProject(project:Project,query:string){
 const text=[project.name,project.sourceName,...project.tracks.flatMap(track=>[track.name,track.stem,stemLabel(track.stem,false),stemLabel(track.stem,true)])].join(' ').toLocaleLowerCase()
 return text.includes(query.trim().toLocaleLowerCase())
}
