import {test,expect} from 'vitest'
import {Diagnostics,redact} from '../src/main/diagnostics'

const home='/Users/zhangwei'

test('redaction removes the account name, project ids and the user音乐 file names',()=>{
 const text=`ENOENT: ${home}/Library/Application Support/printemps/projects/3ae3e3a4-2601-4540-b7c9-09d1771ef0bd/assets/my song.flac`
 const out=redact(text,home)
 expect(out).not.toContain('zhangwei')
 expect(out).not.toContain('my song')
 expect(out).not.toContain('3ae3e3a4')
 // The shape that helps debugging survives.
 expect(out).toContain('ENOENT')
 expect(out).toContain('Library/Application Support/printemps/projects')
 expect(out).toContain('<audio>.flac')
 expect(out).toContain('<id>')
})

test('Windows paths and a bare account name are redacted too',()=>{
 const win='C:\\Users\\zhangwei'
 const out=redact(`open ${win}\\AppData\\Roaming\\printemps\\a.WAV failed for user zhangwei`,win)
 expect(out).not.toContain('zhangwei')
 expect(out).toContain('<audio>.wav')
 expect(out).toContain('failed for user <user>')
})

test('the buffer is bounded and the report carries context and entries',()=>{
 const log=new Diagnostics(3,home)
 expect(log.size).toBe(0)
 for(let i=0;i<5;i++)log.record('task',`failure ${i} at ${home}/x.mp3`)
 expect(log.size).toBe(3)
 const report=log.report({app:'0.1.1',platform:'darwin',device:'auto'})
 expect(report).toContain('app: 0.1.1')
 expect(report).toContain('entries: 3')
 expect(report).toContain('failure 4')
 expect(report).not.toContain('failure 1')
 expect(report).not.toContain('zhangwei')
 expect(report).toContain('<audio>.mp3')
})

test('an empty session still produces a usable report',()=>{
 expect(new Diagnostics(10,home).report({app:'0.1.1'})).toContain('no failures recorded')
})

test('an Error keeps its stack',()=>{
 const log=new Diagnostics(10,home)
 log.record('ipc',new Error('boom'))
 expect(log.report({})).toMatch(/boom[\s\S]*diagnostics\.test/)
})
