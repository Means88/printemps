import {expect,test} from 'vitest'
import {closeSaveFailure} from '../src/shared/save-failure'

test('close-save failures explain recovery without exposing private paths or unrelated model settings',()=>{
 const permission=closeSaveFailure(new Error('EACCES: /private/user/music/project.json'),true)
 expect(permission.message).toContain('Restore write access')
 expect(permission.message).toContain('Retry save')
 expect(permission.message).not.toContain('/private/')
 expect(permission.message).not.toContain('cache')
 expect(closeSaveFailure('ENOSPC',false).message).toContain('释放空间')
 expect(closeSaveFailure('The window did not finish saving. Please try again.',true).message).toContain('wait for saving')
 expect(closeSaveFailure('unknown failure',false).message).toContain('重试保存')
})
