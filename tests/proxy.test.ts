import {test,expect} from 'vitest'
import {normalizeProxyUrl,proxyConfig,proxyCredentials} from '../src/main/proxy'
test('proxy addresses normalise to scheme, host and port',()=>{
 expect(normalizeProxyUrl('')).toBe('')
 expect(normalizeProxyUrl(' 127.0.0.1:7890 ')).toBe('http://127.0.0.1:7890')
 expect(normalizeProxyUrl('socks5://localhost:1080/')).toBe('socks5://localhost:1080')
 expect(normalizeProxyUrl('http://user:p%40ss@proxy.example:3128')).toBe('http://user:p%40ss@proxy.example:3128')
 expect(()=>normalizeProxyUrl('ftp://x')).toThrow('scheme')
 expect(()=>normalizeProxyUrl('http://')).toThrow()
 expect(()=>normalizeProxyUrl('http://host:8080/path')).toThrow('host and port only')
 expect(()=>normalizeProxyUrl('not a url at all :')).toThrow()
})
test('proxy configuration maps to Electron session modes and strips credentials from the rules',()=>{
 expect(proxyConfig({proxyMode:'system',proxyUrl:''})).toEqual({mode:'system'})
 expect(proxyConfig({proxyMode:'direct',proxyUrl:'http://ignored:1'})).toEqual({mode:'direct'})
 expect(proxyConfig({proxyMode:'manual',proxyUrl:''})).toEqual({mode:'system'})
 expect(proxyConfig({proxyMode:'manual',proxyUrl:'http://user:p%40ss@proxy.example:3128'})).toEqual({mode:'fixed_servers',proxyRules:'http://proxy.example:3128'})
 expect(proxyConfig({proxyMode:'manual',proxyUrl:'socks5://127.0.0.1:1080'})).toEqual({mode:'fixed_servers',proxyRules:'socks5://127.0.0.1:1080'})
 expect(proxyCredentials({proxyMode:'manual',proxyUrl:'http://user:p%40ss@proxy.example:3128'})).toEqual({username:'user',password:'p@ss'})
 expect(proxyCredentials({proxyMode:'manual',proxyUrl:'http://proxy.example:3128'})).toBeNull()
 expect(proxyCredentials({proxyMode:'system',proxyUrl:'http://u:p@proxy.example:3128'})).toBeNull()
})
