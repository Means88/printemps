import {test,expect} from 'vitest'
import {visibleTrackCount} from '../src/shared/timeline'
test('home and history count only tracks the workspace shows',()=>{
 const project={tracks:[{hidden:false},{},{hidden:true},{hidden:false}]}
 expect(visibleTrackCount(project)).toBe(3)
 expect(visibleTrackCount({tracks:[]})).toBe(0)
})
