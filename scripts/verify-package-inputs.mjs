import {promises as fs} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {verifyMacWheelMinimums} from './runtime-platform.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const manifest=JSON.parse(await fs.readFile(path.join(root,'.runtime/manifest.json'),'utf8'))
if(manifest.platform!==process.platform||manifest.arch!==process.arch)throw new Error('Runtime does not match the build host; prepare a native runtime')
const requirementsSha256=createHash('sha256').update(await fs.readFile(path.join(root,'worker/requirements.lock'))).digest('hex')
if(manifest.requirementsSha256!==requirementsSha256)throw new Error('Runtime was not prepared with the current dependency lock; run runtime:prepare')
if(process.platform==='darwin'){
 const config=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'))
 const pythonSeries=manifest.python.split('.').slice(0,2).join('.')
 await verifyMacWheelMinimums(path.join(root,'.runtime/python/lib',`python${pythonSeries}`,'site-packages'),process.arch,config.build.mac.minimumSystemVersion)
}
await fs.access(path.join(root,'.runtime/python',process.platform==='win32'?'python.exe':'bin/python3'))
const model=JSON.parse(await fs.readFile(path.join(root,'worker/analysis-manifest.json'),'utf8')),weight=await fs.readFile(path.join(root,'worker/assets/small0.ckpt'))
if(weight.length!==model.bytes||createHash('sha256').update(weight).digest('hex')!==model.sha256)throw new Error('Analysis asset is missing or damaged; run runtime:prepare')
console.log('Runtime and analysis package inputs verified')
