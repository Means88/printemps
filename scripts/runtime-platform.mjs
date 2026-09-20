import {promises as fs} from 'node:fs'
import path from 'node:path'

export function compareMacVersions(a,b){
 const left=a.split('.').map(Number),right=b.split('.').map(Number)
 for(let index=0;index<Math.max(left.length,right.length);index++){
  const difference=(left[index]||0)-(right[index]||0)
  if(difference)return difference
 }
 return 0
}

/** Wheel tags express alternative supported platforms; use the lowest matching tag per wheel. */
export function macWheelMinimum(wheel,arch){
 const machine=arch==='arm64'?'arm64':arch==='x64'?'x86_64':null
 if(!machine)throw new Error(`Unsupported macOS architecture: ${arch}`)
 const versions=[]
 for(const line of wheel.split('\n').filter(line=>line.startsWith('Tag:'))){
  for(const match of line.matchAll(/macosx_(\d+)_(\d+)_(arm64|x86_64|universal2)(?=\.|\s|$)/g)){
   if(match[3]===machine||match[3]==='universal2')versions.push(`${match[1]}.${match[2]}`)
  }
 }
 return versions.sort(compareMacVersions)[0]??null
}

export async function verifyMacWheelMinimums(sitePackages,arch,declaredMinimum){
 const incompatible=[]
 for(const entry of await fs.readdir(sitePackages,{withFileTypes:true})){
  if(!entry.isDirectory()||!entry.name.endsWith('.dist-info'))continue
  let wheel
  try{wheel=await fs.readFile(path.join(sitePackages,entry.name,'WHEEL'),'utf8')}catch(error){if(error.code==='ENOENT')continue;throw error}
  const minimum=macWheelMinimum(wheel,arch)
  if(minimum&&compareMacVersions(minimum,declaredMinimum)>0)incompatible.push(`${entry.name}: macOS ${minimum}`)
 }
 if(incompatible.length)throw new Error(`Bundled dependencies exceed macOS ${declaredMinimum}: ${incompatible.join(', ')}. Raise the application minimum or use compatible dependency builds.`)
}
