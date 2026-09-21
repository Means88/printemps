import {test,expect} from 'vitest'
import {normalizeEndpoint,modelBaseUrl,DEFAULT_HF_ENDPOINT} from '../src/main/models'
import manifest from '../src/shared/model-manifest.json'

test('download sources normalise to scheme, host and port',()=>{
 expect(normalizeEndpoint('')).toBe('')
 expect(normalizeEndpoint('  ')).toBe('')
 expect(normalizeEndpoint('hf-mirror.com')).toBe('https://hf-mirror.com')
 expect(normalizeEndpoint('https://hf-mirror.com/')).toBe('https://hf-mirror.com')
 expect(normalizeEndpoint('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080')
 expect(()=>normalizeEndpoint('ftp://mirror')).toThrow('http or https')
 expect(()=>normalizeEndpoint('https://mirror/path')).toThrow('host and port only')
 expect(()=>normalizeEndpoint('https://user:pass@mirror')).toThrow('credentials')
 expect(()=>normalizeEndpoint('https://')).toThrow()
})

test('the model base url follows the chosen source and keeps the pinned repository and revision',()=>{
 const suffix=`/${manifest.repository}/resolve/${manifest.revision}/`
 expect(modelBaseUrl('')).toBe(`${DEFAULT_HF_ENDPOINT}${suffix}`)
 expect(modelBaseUrl('https://hf-mirror.com')).toBe(`https://hf-mirror.com${suffix}`)
})
