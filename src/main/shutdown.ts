/** Stop cancellable jobs, then let disk writes and worker cleanup finish before exiting. */
export class ShutdownCoordinator {
 private pending:Promise<void>|null=null
 constructor(private cancel:()=>void,private busy:()=>boolean,private finish:()=>void,private wait=()=>new Promise<void>(resolve=>setTimeout(resolve,50))){}
 request():Promise<void>{
  if(this.pending)return this.pending
  this.pending=this.drain()
  return this.pending
 }
 private async drain(){
  this.cancel()
  while(this.busy())await this.wait()
  this.finish()
 }
}
