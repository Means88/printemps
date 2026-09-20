// Local transfer verification using the installed updater and real embedded blockmaps.
import {createServer} from 'node:http'
import {createReadStream} from 'node:fs'
import {mkdtemp,readFile,writeFile,mkdir,rm,stat,realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {load}=require('js-yaml')
const {CancellationToken}=require('builder-util-runtime')
const {NodeHttpExecutor}=require('builder-util/out/nodeHttpExecutor')
const {FileWithEmbeddedBlockMapDifferentialDownloader}=require('electron-updater/out/differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader')

const [oldArgument,newArgument,metadataArgument,reportArgument]=process.argv.slice(2)
if(!oldArgument||!newArgument||!metadataArgument||!reportArgument)throw new Error('Usage: node scripts/verify-appimage-delta.mjs OLD.AppImage NEW.AppImage latest-linux.yml report.json')
const [oldFile,newFile]=await Promise.all([realpath(oldArgument),realpath(newArgument)])
const reportFile=path.resolve(reportArgument)
if(oldFile===newFile||[oldFile,newFile,path.resolve(metadataArgument)].includes(reportFile))throw new Error('Use separate input and report files')
const metadata=load(await readFile(metadataArgument,'utf8'))
const info=metadata.files?.find(file=>file.url===path.basename(newFile))
const size=(await stat(newFile)).size
if(!info||info.size!==size||!Number.isSafeInteger(info.blockMapSize)||info.blockMapSize<=0||info.blockMapSize>=size||typeof info.sha512!=='string')throw new Error('Invalid AppImage update metadata')
const root=await mkdtemp(path.join(tmpdir(),'printemps-appimage-delta-'))
let transferred=0,requests=0
const server=createServer((request,response)=>{
 const range=request.headers.range?.match(/^bytes=(\d+)-(\d+)$/)
 const start=Number(range?.[1]),end=Number(range?.[2])
 if(request.url!=='/update.AppImage'||request.method!=='GET'||!range||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>=size){response.writeHead(416);response.end();return}
 requests++
 response.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes',Connection:'close'})
 const stream=createReadStream(newFile,{start,end})
 stream.on('data',chunk=>{transferred+=chunk.length})
 stream.on('error',error=>response.destroy(error))
 response.on('close',()=>stream.destroy())
 stream.pipe(response)
})
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
 const address=server.address()
 const downloader=new FileWithEmbeddedBlockMapDifferentialDownloader(info,new NodeHttpExecutor(),{
  oldFile,newFile:path.join(root,'reconstructed.AppImage'),newUrl:new URL(`http://127.0.0.1:${address.port}/update.AppImage`),
  requestHeaders:null,isUseMultipleRangeRequest:false,cancellationToken:new CancellationToken(),
  logger:{info:message=>console.log(message),warn:message=>console.warn(message),error:message=>console.error(message)}
 })
 // The downloader validates the reconstructed artifact against metadata.sha512.
 await downloader.download()
 const report={oldFile,newFile,version:metadata.version,fullBytes:size,downloadedBytes:transferred,reusedBytes:size-transferred,savedPercent:Number(((1-transferred/size)*100).toFixed(3)),rangeRequests:requests,sha512:info.sha512,checksumVerified:true,scope:'Local HTTP Range transfer and reconstruction; no installer launch or release-server verification'}
 await mkdir(path.dirname(reportFile),{recursive:true});await writeFile(reportFile,JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report,null,2))
 if(transferred>=size)throw new Error('This pair of builds did not reduce download size')
}finally{
 await new Promise(resolve=>server.close(resolve))
 await rm(root,{recursive:true,force:true})
}
