import {test,expect} from 'vitest'
import {EventEmitter} from 'node:events'
import {UpdateService,type UpdateDriver} from '../src/main/updates'
class Driver extends EventEmitter implements UpdateDriver {
 autoDownload=true;autoInstallOnAppQuit=true;disableDifferentialDownload=true
 checks=0;downloads=0;installs=0;fail=false
 async checkForUpdates(){this.checks++;if(this.fail)throw new Error('offline');this.emit('update-available',{version:'0.2.0'});return {}}
 async downloadUpdate(){this.downloads++;this.emit('download-progress',{percent:42,transferred:42,total:100});this.emit('update-downloaded',{version:'0.2.0'})}
 quitAndInstall(){this.installs++}
}
test('updates are explicit, allow differential transfer and block installation during audio work',async()=>{
 const driver=new Driver();let busy=true;const phases:string[]=[]
 const service=new UpdateService(driver,'0.1.0',true,()=>busy,s=>phases.push(s.phase))
 expect(driver.checks).toBe(0);expect(driver.autoDownload).toBe(false);expect(driver.autoInstallOnAppQuit).toBe(false);expect(driver.disableDifferentialDownload).toBe(false)
 await expect(service.download()).rejects.toThrow('Check')
 expect((await service.check()).phase).toBe('available');expect(driver.downloads).toBe(0)
 expect((await service.download()).phase).toBe('ready');expect(phases).toContain('downloading')
 expect(()=>service.install()).toThrow('audio tasks');expect(service.status().phase).toBe('ready');expect(driver.installs).toBe(0)
 busy=false;service.install();expect(driver.installs).toBe(1);expect(service.status().phase).toBe('installing')
})
test('offline checks are retryable and development builds never contact release provider',async()=>{
 const driver=new Driver(),dev=new UpdateService(driver,'0.1.0',false,()=>false,()=>{})
 expect((await dev.check()).phase).toBe('development');expect(driver.checks).toBe(0)
 const release=new UpdateService(new Driver(),'0.1.0',true,()=>false,()=>{})
 const broken=new Driver();broken.fail=true
 const service=new UpdateService(broken,'0.1.0',true,()=>false,()=>{})
 expect((await service.check()).error).toBe('offline');broken.fail=false;expect((await service.check()).phase).toBe('available')
 expect(release.status().phase).toBe('idle')
})
