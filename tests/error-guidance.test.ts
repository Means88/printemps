import {test,expect} from 'vitest'
import {errorGuidance} from '../src/renderer/error-notice'
test('task failures give localized recovery actions without replacing diagnostic details',()=>{
 expect(errorGuidance('Error invoking remote method: fetch failed',false,'download')).toContain('检查网络')
 expect(errorGuidance('ENOSPC: no space left on device',true)).toContain('Free space')
 expect(errorGuidance('CUDA out of memory',true)).toContain('processing memory')
 expect(errorGuidance('Model integrity check failed',false)).toContain('重新下载')
 expect(errorGuidance('Operation was aborted',false)).toContain('已取消')
 expect(errorGuidance('Unexpected worker exit',true)).toContain('source track is retained')
})
