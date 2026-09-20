import {test,expect} from 'vitest'
import {ShutdownCoordinator} from '../src/main/shutdown'
test('shutdown cancels once and waits for worker cleanup and disk operations before exit',async()=>{
 let active=2,cancelled=0,finished=0,release!:()=>void
 const coordinator=new ShutdownCoordinator(()=>cancelled++,()=>active>0,()=>finished++,()=>new Promise(resolve=>{release=resolve}))
 const first=coordinator.request(),second=coordinator.request()
 expect(first).toBe(second);expect(cancelled).toBe(1);expect(finished).toBe(0)
 active=1;release();await Promise.resolve()
 expect(finished).toBe(0)
 active=0;release();await first
 expect(finished).toBe(1)
})
