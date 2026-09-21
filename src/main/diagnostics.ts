import {homedir} from 'node:os'

export type DiagnosticEntry={at:string;kind:string;message:string}

const AUDIO=/[^/\\:"']+\.(wav|flac|mp3|m4a|aiff?|ogg)\b/gi
const UUID=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

/**
 * The export is meant to be attached to a public issue, so identity and the user's music must not
 * ride along. Redact by known segments rather than by path grammar: a path can contain spaces, so
 * matching "everything after ~" either stops too early or swallows the surrounding message.
 */
export function redact(text:string,home:string=homedir()):string{
 let out=String(text)
 // Not path.basename: it only splits on the host separator, so a Windows home read on macOS keeps its backslashes.
 const account=home.split(/[/\\]/).filter(Boolean).pop()||''
 for(const root of new Set([home,home.replace(/\\/g,'/')])) if(root) out=out.split(root).join('~')
 if(account&&account.length>1) out=out.split(account).join('<user>')
 out=out.replace(UUID,'<id>')
 // Keep the extension: knowing it was a FLAC matters, knowing which song does not.
 return out.replace(AUDIO,(_m,ext)=>`<audio>.${String(ext).toLowerCase()}`)
}

/** Recent failures, kept in memory only. Nothing is written or sent unless the user exports it. */
export class Diagnostics {
 private entries:DiagnosticEntry[]=[]
 constructor(private limit=200,private home:string=homedir()){}
 get size(){return this.entries.length}
 record(kind:string,message:unknown){
  const text=message instanceof Error?`${message.message}${message.stack?`\n${message.stack}`:''}`:String(message)
  this.entries.push({at:new Date().toISOString(),kind,message:redact(text,this.home).slice(0,4000)})
  if(this.entries.length>this.limit)this.entries.splice(0,this.entries.length-this.limit)
 }
 /** A plain-text report; `context` carries versions and settings that are safe to share. */
 report(context:Record<string,string>):string{
  const header=Object.entries(context).map(([key,value])=>`${key}: ${redact(String(value),this.home)}`)
  const body=this.entries.length
   ? this.entries.map(e=>`[${e.at}] ${e.kind}\n${e.message}`)
   : ['(no failures recorded in this session)']
  return [`Printemps diagnostics`,...header,'',`entries: ${this.entries.length}`,'',...body,''].join('\n')
 }
}
