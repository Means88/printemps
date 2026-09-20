import {ExclamationTriangleIcon} from '@radix-ui/react-icons'
import {diagnosticDetail} from '../shared/diagnostic'
export function errorGuidance(message:string,en:boolean,kind:'download'|'separation'|'export'='separation'){
 const text=(zh:string,english:string)=>en?english:zh
 if(/outside (?:private )?application storage/i.test(message))return kind==='export'?text('该目录由应用管理，请选择其它导出文件夹。','This folder is managed by the app. Choose another export folder.'):text('该目录由应用管理。请选择其它文件夹，或恢复默认目录。','This folder is managed by the app. Choose another folder or restore the default location.')
 if(kind==='export'){
  if(/ENOSPC|insufficient disk|no space left/i.test(message))return text('导出目录空间不足。请释放空间或选择其它文件夹后重试。','The export folder has insufficient space. Free space or choose another folder and retry.')
  if(/EACCES|EPERM|permission denied|read.only|outside application storage/i.test(message))return text('无法写入导出目录。请重新导出，并选择有写入权限的其它文件夹。','Cannot write to the export folder. Export again and choose another writable folder.')
  return text('导出失败，剪辑未受影响。请重试；若仍失败，请选择其它导出文件夹。','Export failed. The clip is unchanged. Retry, or choose another export folder if the problem persists.')
 }
 if(/Separation interrupted before completion/i.test(message))return text('上次分离被中断，已完成的结果已保留。可重试未完成的声部。','The previous separation was interrupted. Completed results are retained. Retry the unfinished stems.')
 if(/abort|cancelled|canceled/i.test(message))return text('操作已取消。需要时可重新开始。','Operation cancelled. Start again when ready.')
 if(/ENOSPC|insufficient disk|no space left/i.test(message))return text('磁盘空间不足。请释放空间；模型下载也可在设置中更换缓存目录后重试。','Not enough disk space. Free space, or change the model cache folder in Settings before retrying a download.')
 if(/EACCES|EPERM|permission denied|read.only/i.test(message))return text('无法写入文件夹。请检查访问权限，或在设置中选择可写入的缓存目录后重试。','Cannot write to the folder. Check permissions, or choose a writable cache folder in Settings and retry.')
 if(/integrity|checksum|size mismatch/i.test(message))return text('下载的模型未通过校验。请重新下载；已完成的项目结果不受影响。','The downloaded model failed verification. Download it again; completed project results are unaffected.')
 if(/fetch failed|failed to fetch|network|ENOTFOUND|ECONN|ETIMEDOUT|download failed|download interrupted/i.test(message))return text('模型下载中断或网络不可用。请检查网络后重试；已缓存的模型仍可使用。','Model download was interrupted or the network is unavailable. Check your connection and retry. Cached models remain available.')
 if(/out of memory|allocate memory|allocation failed/i.test(message))return text('处理所需内存不足。请关闭其它占用内存的应用，或在设置中切换处理设备后重试。','There is not enough processing memory. Close memory-heavy applications, or change the processing device in Settings and retry.')
 if(/CUDA|MPS|device.*unavailable/i.test(message))return text('所选处理设备无法完成任务。请在设置中选择 CPU 后重试。','The selected device could not complete the task. Select CPU in Settings and retry.')
 return kind==='download'?text('模型操作失败。请检查网络、缓存目录和可用空间后重试。','Model operation failed. Check the connection, cache folder, and free space, then retry.'):text('分离未完成，源音轨已保留。请重试，或切换处理设备后再试。','Separation did not complete. The source track is retained. Retry, or change the processing device and try again.')
}
/** Short state title that pairs with errorGuidance, mirroring the recovery cards in board 10. */
export function errorHeadline(message:string,en:boolean,kind:'download'|'separation'|'export'='separation'){
 const text=(zh:string,english:string)=>en?english:zh
 if(kind==='export'){
  if(/ENOSPC|insufficient disk|no space left/i.test(message))return text('导出目录空间不足','Export folder is full')
  if(/EACCES|EPERM|permission denied|read.only|outside (?:private )?application storage/i.test(message))return text('无法写入导出目录','Cannot write to the export folder')
  return text('导出失败','Export failed')
 }
 if(/Separation interrupted before completion/i.test(message))return text('分离被中断','Separation interrupted')
 if(/abort|cancelled|canceled/i.test(message))return text('已取消','Cancelled')
 if(/ENOSPC|insufficient disk|no space left/i.test(message))return text('磁盘空间不足','Not enough disk space')
 if(/EACCES|EPERM|permission denied|read.only|outside (?:private )?application storage/i.test(message))return text('无法写入文件夹','Cannot write to the folder')
 if(/integrity|checksum|size mismatch/i.test(message))return text('模型校验失败','Model failed verification')
 if(/fetch failed|failed to fetch|network|ENOTFOUND|ECONN|ETIMEDOUT|download failed|download interrupted/i.test(message))return text('下载中断','Download interrupted')
 if(/out of memory|allocate memory|allocation failed/i.test(message))return text('内存不足','Not enough memory')
 if(/CUDA|MPS|device.*unavailable/i.test(message))return text('处理设备不可用','Processing device unavailable')
 return kind==='download'?text('模型操作失败','Model operation failed'):text('分离失败','Separation failed')
}
export function ErrorNotice({message,en,kind='separation'}:{message:string;en:boolean;kind?:'download'|'separation'|'export'}){
 if(!message)return null
 return <div className="error-notice" role="alert"><div className="error-notice-heading"><ExclamationTriangleIcon aria-hidden="true"/><strong>{errorHeadline(message,en,kind)}</strong></div><p>{errorGuidance(message,en,kind)}</p><details><summary>{en?'Technical details':'技术详情'}</summary><pre>{diagnosticDetail(message)}</pre></details></div>
}
