import {test,expect} from 'vitest'
import {diagnosticDetail} from '../src/shared/diagnostic'
test('technical details drop IPC wrapper prefixes but keep the underlying cause',()=>{
 expect(diagnosticDetail("Error: Error invoking remote method 'projects:import': Error: /tmp/x.wav: Invalid data found when processing input")).toBe('/tmp/x.wav: Invalid data found when processing input')
 expect(diagnosticDetail("Error invoking remote method 'tracks:edit': EACCES: permission denied, open '/p/project.json'")).toBe("EACCES: permission denied, open '/p/project.json'")
 expect(diagnosticDetail('Separation interrupted before completion')).toBe('Separation interrupted before completion')
 expect(diagnosticDetail('Error: ')).toBe('Error: ')
})
