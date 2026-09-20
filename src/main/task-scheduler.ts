/** One compute worker at a time; downloads and playback use separate resources. */
export class TaskScheduler {
 private active=false
 private queue:(()=>void)[]=[]
 acquire(signal:AbortSignal):Promise<()=>void>{
  return new Promise((resolve,reject)=>{
   if(signal.aborted){reject(new Error('Task cancelled'));return}
   const abort=()=>{this.queue=this.queue.filter(item=>item!==start);reject(new Error('Task cancelled'))}
   const start=()=>{
    signal.removeEventListener('abort',abort)
    if(signal.aborted){reject(new Error('Task cancelled'));this.next();return}
    this.active=true;let released=false
    resolve(()=>{if(released)return;released=true;this.active=false;this.next()})
   }
   signal.addEventListener('abort',abort,{once:true})
   if(this.active)this.queue.push(start);else start()
  })
 }
 private next(){if(!this.active)this.queue.shift()?.()}
}
