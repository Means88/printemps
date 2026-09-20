/** Recovery copy for the native close guard; private filesystem paths stay out of the alert. */
export function closeSaveFailure(error:unknown,en:boolean){
 const message=error instanceof Error?error.message:String(error)
 const t=(zh:string,english:string)=>en?english:zh
 const title=t('尚未完成保存','Changes have not been saved')
 let action:string
 if(/ENOSPC|no space left|insufficient disk/i.test(message))
  action=t('磁盘空间不足。请释放空间后，在工作区点击“重试保存”。','Not enough disk space. Free space, then choose “Retry save” in the workspace.')
 else if(/EACCES|EPERM|permission denied|read.only/i.test(message))
  action=t('无法写入项目目录。请恢复目录的写入权限后，在工作区点击“重试保存”。','Cannot write to the project folder. Restore write access, then choose “Retry save” in the workspace.')
 else if(/did not finish saving/i.test(message))
  action=t('保存尚未响应。请回到工作区等待保存完成，再关闭窗口。','Saving has not responded. Return to the workspace and wait for saving to finish before closing.')
 else action=t('请回到工作区重试保存，再关闭窗口。','Return to the workspace and retry saving before closing.')
 return {title,message:t('窗口将保持打开，以保留未保存的修改。','The window will stay open to retain unsaved changes.')+'\n\n'+action}
}
