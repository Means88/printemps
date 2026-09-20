import {test,expect} from 'vitest'
import {TaskScheduler} from '../src/main/task-scheduler'
test('compute tasks are FIFO and cancelling a queued task does not interrupt the active one',async()=>{
 const queue=new TaskScheduler(),controller=new AbortController()
 const first=await queue.acquire(new AbortController().signal)
 const pending=queue.acquire(controller.signal);const rejected=expect(pending).rejects.toThrow('cancelled')
 let thirdStarted=false
 const third=queue.acquire(new AbortController().signal).then(release=>{thirdStarted=true;return release})
 controller.abort();await rejected;expect(thirdStarted).toBe(false)
 first();const release=await third;expect(thirdStarted).toBe(true);first();release()
 const next=await queue.acquire(new AbortController().signal);next()
})
