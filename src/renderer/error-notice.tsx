export function errorGuidance(message:string,en:boolean,kind:'download'|'separation'='separation'){
 const text=(zh:string,english:string)=>en?english:zh
 if(/abort|cancelled|canceled/i.test(message))return text('操作已取消。需要时可重新开始。','Operation cancelled. Start again when ready.')
 if(/ENOSPC|insufficient disk|no space left/i.test(message))return text('磁盘空间不足。请释放空间；模型下载也可在设置中更换缓存目录后重试。','Not enough disk space. Free space, or change the model cache folder in Settings before retrying a download.')
 if(/EACCES|EPERM|permission denied|read.only/i.test(message))return text('无法写入文件夹。请检查访问权限，或在设置中选择可写入的缓存目录后重试。','Cannot write to the folder. Check permissions, or choose a writable cache folder in Settings and retry.')
 if(/integrity|checksum|size mismatch/i.test(message))return text('下载的模型未通过校验。请重新下载；已完成的项目结果不受影响。','The downloaded model failed verification. Download it again; completed project results are unaffected.')
 if(/fetch failed|failed to fetch|network|ENOTFOUND|ECONN|ETIMEDOUT|download failed/i.test(message))return text('模型下载中断或网络不可用。请检查网络后重试；已缓存的模型仍可使用。','Model download was interrupted or the network is unavailable. Check your connection and retry. Cached models remain available.')
 if(/out of memory|allocate memory|allocation failed/i.test(message))return text('处理所需内存不足。请关闭其它占用内存的应用，或在设置中切换处理设备后重试。','There is not enough processing memory. Close memory-heavy applications, or change the processing device in Settings and retry.')
 if(/CUDA|MPS|device.*unavailable/i.test(message))return text('所选处理设备无法完成任务。请在设置中选择 CPU 后重试。','The selected device could not complete the task. Select CPU in Settings and retry.')
 return kind==='download'?text('模型操作失败。请检查网络、缓存目录和可用空间后重试。','Model operation failed. Check the connection, cache folder, and free space, then retry.'):text('分离未完成，源音轨已保留。请重试，或切换处理设备后再试。','Separation did not complete. The source track is retained. Retry, or change the processing device and try again.')
}
export function ErrorNotice({message,en,kind='separation'}:{message:string;en:boolean;kind?:'download'|'separation'}){
 if(!message)return null
 return <div className="error-notice" role="alert"><p>{errorGuidance(message,en,kind)}</p><details><summary>{en?'Technical details':'技术详情'}</summary><pre>{message}</pre></details></div>
}
