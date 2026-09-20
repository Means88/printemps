// Isolated Node worker: Essentia WASM never blocks the renderer or Electron main loop.
const {parentPort,workerData}=require('node:worker_threads')
const fs=require('node:fs')
const path=require('node:path')
try {
 const local=path.join(__dirname,'essentia')
 const {Essentia,EssentiaWASM}=fs.existsSync(local)?{Essentia:require(path.join(local,'essentia.js-core.umd.js')),EssentiaWASM:require(path.join(local,'essentia-wasm.umd.js'))}:require('essentia.js')
 const data=fs.readFileSync(workerData.input)
 if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE')throw new Error('Invalid canonical WAV')
 let channels=0,rate=0,bits=0,format=0,samples
 for(let at=12;at+8<=data.length;){
  const size=data.readUInt32LE(at+4),begin=at+8,id=data.toString('ascii',at,at+4)
  if(begin+size>data.length)throw new Error('Truncated WAV')
  if(id==='fmt '){
   if(size<16)throw new Error('Invalid WAV format')
   format=data.readUInt16LE(begin);channels=data.readUInt16LE(begin+2);rate=data.readUInt32LE(begin+4);bits=data.readUInt16LE(begin+14)
   if(format===65534&&size>=40){const guid=data.subarray(begin+24,begin+40).toString('hex');format=guid==='0300000000001000800000aa00389b71'?3:guid==='0100000000001000800000aa00389b71'?1:0}
  }
  if(id==='data')samples=data.subarray(begin,begin+size)
  at=begin+size+size%2
 }
 if(!samples||channels!==2||rate!==44100||!((format===3&&bits===32)||(format===1&&[16,24,32].includes(bits))))throw new Error('Unsupported canonical audio')
 const bytes=bits/8,frames=samples.length/bytes/channels
 if(!Number.isInteger(frames)||!frames)throw new Error('Incomplete WAV frames')
 const mono=new Float32Array(frames);let power=0
 for(let i=0;i<frames;i++){
  let sum=0
  for(let c=0;c<channels;c++){
   const offset=(i*channels+c)*bytes,value=format===3?samples.readFloatLE(offset):samples.readIntLE(offset,bytes)/2**(bits-1)
   if(!Number.isFinite(value))throw new Error('Non-finite audio sample')
   sum+=value/channels
  }
  mono[i]=sum;power+=sum*sum
 }
 if(frames<rate*2||Math.sqrt(power/frames)<1e-6)parentPort.postMessage({key:null,strength:null})
 else {
  const engine=new Essentia(EssentiaWASM),vector=engine.arrayToVector(mono)
  try {const result=engine.KeyExtractor(vector);parentPort.postMessage({key:`${result.key} ${result.scale}`,strength:result.strength})}
  finally{vector.delete();engine.shutdown()}
 }
}catch(error){parentPort.postMessage({error:error.message||String(error)})}
