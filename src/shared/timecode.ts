/** Millisecond timecode, with hours only when needed. */
export function formatTimecode(seconds:number){
 const total=Math.round(Math.max(0,seconds)*1000),ms=total%1000,whole=Math.floor(total/1000)
 const sec=String(whole%60).padStart(2,'0'),min=String(Math.floor(whole/60)%60).padStart(2,'0'),hours=Math.floor(whole/3600)
 return `${hours?`${String(hours).padStart(2,'0')}:`:''}${min}:${sec}.${String(ms).padStart(3,'0')}`
}
/** Accept plain seconds or mm:ss / hh:mm:ss, never partial numeric strings. */
export function parseTimecode(text:string):number|null{
 const value=text.trim()
 if(!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(value))return null
 const parts=value.split(':').map(Number)
 if(parts.length>1&&parts.slice(1).some(part=>part>=60))return null
 const seconds=parts.reduce((sum,part)=>sum*60+part,0)
 return Number.isFinite(seconds)?seconds:null
}
