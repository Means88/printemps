import {test,expect} from 'vitest'
import {workerEnvironment} from '../src/main/json-worker'

test('the worker runs with UTF-8 stdio and without inherited interpreter roots',()=>{
 const previous={home:process.env.PYTHONHOME,path:process.env.PYTHONPATH}
 process.env.PYTHONHOME='/leaked/home';process.env.PYTHONPATH='/leaked/path'
 try{
  const environment=workerEnvironment(4242)
  // Node writes the request as UTF-8; a locale code page on Windows would corrupt escaped separators.
  expect(environment.PYTHONIOENCODING).toBe('utf-8')
  expect(environment.PYTHONHOME).toBeUndefined()
  expect(environment.PYTHONPATH).toBeUndefined()
  expect(environment.PRINTEMPS_PARENT_PID).toBe('4242')
  expect(environment.PYTHONUNBUFFERED).toBe('1')
  expect(environment.PYTHONNOUSERSITE).toBe('1')
 }finally{
  if(previous.home===undefined)delete process.env.PYTHONHOME;else process.env.PYTHONHOME=previous.home
  if(previous.path===undefined)delete process.env.PYTHONPATH;else process.env.PYTHONPATH=previous.path
 }
})

test('a request with a non-ASCII path survives a UTF-8 round trip that a DBCS page would break',()=>{
 // Exactly the shape that produced "Invalid \escape: line 1 column 24 (char 23)" on a Chinese Windows.
 const request={input:'C:\\Users\\张\\AppData\\Roaming\\printemps\\a.wav',output:'x',device:'cpu',targets:[]}
 const line=JSON.stringify(request)
 expect(JSON.parse(Buffer.from(line,'utf8').toString('utf8'))).toEqual(request)
 expect(Buffer.from(line,'utf8').toString('latin1')).not.toBe(line)
})
