import type {Settings} from '../shared/domain'
export const proxyProtocols=['http:','https:','socks4:','socks5:','socks:'] as const
/** Normalise a user-entered proxy address to `scheme://[user:pass@]host[:port]`; empty stays empty. */
export function normalizeProxyUrl(value:string):string{
 const text=value.trim();if(!text)return ''
 let url:URL
 try{url=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text)?text:`http://${text}`)}catch{throw new Error('Invalid proxy address')}
 if(!(proxyProtocols as readonly string[]).includes(url.protocol))throw new Error('Proxy scheme must be http, https, socks4 or socks5')
 if(!url.hostname)throw new Error('Proxy address needs a host')
 if((url.pathname&&url.pathname!=='/')||url.search||url.hash)throw new Error('Proxy address must be scheme, host and port only')
 return url.href.replace(/\/$/,'')
}
type ProxySettings=Pick<Settings,'proxyMode'|'proxyUrl'>
/** Electron `session.setProxy` configuration for the current settings. Manual mode without an address follows the system. */
export function proxyConfig(settings:ProxySettings):{mode:'system'}|{mode:'direct'}|{mode:'fixed_servers';proxyRules:string}{
 if(settings.proxyMode==='direct')return {mode:'direct'}
 if(settings.proxyMode==='manual'&&settings.proxyUrl){const url=new URL(settings.proxyUrl);return {mode:'fixed_servers',proxyRules:`${url.protocol}//${url.hostname}${url.port?`:${url.port}`:''}`}}
 return {mode:'system'}
}
/** Credentials embedded in a manual proxy address, for the proxy `login` challenge. */
export function proxyCredentials(settings:ProxySettings):{username:string;password:string}|null{
 if(settings.proxyMode!=='manual'||!settings.proxyUrl)return null
 const url=new URL(settings.proxyUrl);if(!url.username)return null
 return {username:decodeURIComponent(url.username),password:decodeURIComponent(url.password)}
}
