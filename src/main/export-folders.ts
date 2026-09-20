import {promises as fs} from 'node:fs'
import path from 'node:path'

/** Only folders containing copies exported during this application session may be opened. */
export class ExportFolders{
 private directories=new Set<string>()
 remember(files:string[]){for(const file of files)this.directories.add(path.dirname(file))}
 async resolve(directory:string){
  if(typeof directory!=='string'||!path.isAbsolute(directory))throw new Error('Unknown export folder')
  const real=await fs.realpath(directory)
  if(!this.directories.has(real)||!(await fs.stat(real)).isDirectory())throw new Error('Unknown export folder')
  return real
 }
}
