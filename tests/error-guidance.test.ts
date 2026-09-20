import {test,expect} from 'vitest'
import {errorGuidance} from '../src/renderer/error-notice'
test('task failures give localized recovery actions without replacing diagnostic details',()=>{
 expect(errorGuidance('Error invoking remote method: fetch failed',false,'download')).toContain('检查网络')
 expect(errorGuidance('ENOSPC: no space left on device',true)).toContain('Free space')
 expect(errorGuidance('CUDA out of memory',true)).toContain('processing memory')
 expect(errorGuidance('Model integrity check failed',false)).toContain('重新下载')
 expect(errorGuidance('Operation was aborted',false)).toContain('已取消')
 expect(errorGuidance('Unexpected worker exit',true)).toContain('source track is retained')
 expect(errorGuidance('Separation interrupted before completion',false)).toContain('重试未完成')
})

 test('export failures point to the destination rather than model cache or processing devices',()=>{
  expect(errorGuidance('ENOSPC',true,'export')).toContain('export folder')
  expect(errorGuidance('EACCES',false,'export')).toContain('导出目录')
  expect(errorGuidance('Unknown encoder error',true,'export')).toContain('clip is unchanged')
  expect(errorGuidance('Choose a folder outside application storage',true,'export')).toContain('another export folder')
 })

test('private storage rejection guides cache selection without irrelevant network advice',()=>{
 const message=errorGuidance('Choose a folder outside private application storage',true,'download')
 expect(message).toContain('restore the default location')
 expect(message).not.toContain('connection')
})
import {errorHeadline} from '../src/renderer/error-notice'
test('recovery notices carry a short state title matching their guidance',()=>{
 expect(errorHeadline('Fixture: download interrupted',false,'download')).toBe('下载中断')
 expect(errorGuidance('Fixture: download interrupted',false,'download')).toContain('检查网络')
 expect(errorHeadline('ENOSPC: no space left on device',true)).toBe('Not enough disk space')
 expect(errorHeadline('Separation interrupted before completion',false)).toBe('分离被中断')
 expect(errorHeadline('EACCES: permission denied',true,'export')).toBe('Cannot write to the export folder')
 expect(errorHeadline('Unexpected worker exit',false)).toBe('分离失败')
})
