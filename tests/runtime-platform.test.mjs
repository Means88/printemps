import {expect,test} from 'vitest'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {macWheelMinimum,verifyMacWheelMinimums} from '../scripts/runtime-platform.mjs'

test('wheel compatibility chooses matching architecture and the lowest alternative',()=>{
 const wheel='Tag: cp314-cp314-macosx_10_9_x86_64.macosx_14_0_arm64\nTag: cp314-cp314-macosx_12_0_universal2\n'
 expect(macWheelMinimum(wheel,'arm64')).toBe('12.0')
 expect(macWheelMinimum(wheel,'x64')).toBe('10.9')
 expect(macWheelMinimum('Tag: py3-none-any','arm64')).toBeNull()
 expect(macWheelMinimum('Tag: cp314-cp314-macosx_14_0_arm64','arm64')).toBe('14.0')
})

test('package preflight rejects a dependency newer than the advertised macOS version',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'printemps-wheel-minimum-'))
 try{
  await mkdir(path.join(root,'example.dist-info'))
  await writeFile(path.join(root,'example.dist-info/WHEEL'),'Tag: cp314-cp314-macosx_14_0_arm64\n')
  await expect(verifyMacWheelMinimums(root,'arm64','12.0')).rejects.toThrow('example.dist-info: macOS 14.0')
  await expect(verifyMacWheelMinimums(root,'arm64','14.0')).resolves.toBeUndefined()
 }finally{await rm(root,{recursive:true,force:true})}
})
