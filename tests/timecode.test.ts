import {expect,test} from 'vitest'
import {formatTimecode,parseTimecode} from '../src/shared/timecode'
test('clip timecodes round trip across minute and hour boundaries',()=>{
 for(const seconds of [0,.001,48,92.125,3599.999,3600,7265.432])expect(parseTimecode(formatTimecode(seconds))).toBe(seconds)
 expect(formatTimecode(59.9996)).toBe('01:00.000')
 expect(formatTimecode(3600)).toBe('01:00:00.000')
 expect(parseTimecode('92.125')).toBe(92.125)
 expect(parseTimecode(' 01:32.125 ')).toBe(92.125)
 for(const text of ['', '-1', '1e3', '1:60', '1:60:00', '1:2:3:4', '12xyz', 'Infinity'])expect(parseTimecode(text)).toBeNull()
})
