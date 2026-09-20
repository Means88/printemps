import {diagnosticDetail} from '../shared/diagnostic'
export function SaveRecovery({message,en,onRetry}:{message:string;en:boolean;onRetry:()=>void}){
 const t=(zh:string,english:string)=>en?english:zh
 const reason=/ENOSPC|no space left|insufficient disk/i.test(message)
  ?t('磁盘空间不足，请释放空间。','Not enough disk space. Free space to continue.')
  :/EACCES|EPERM|permission denied|read.only/i.test(message)
   ?t('无法写入项目目录，请检查写入权限。','Cannot write to the project folder. Check write access.')
   :t('修改尚未保存，请重试。','Changes have not been saved. Please retry.')
 return <section className="save-recovery" aria-label={t('保存失败','Save failed')}>
  <p role="alert">{t('保存失败','Save failed')} · {reason}</p>
  <details><summary>{t('技术详情','Technical details')}</summary><pre>{diagnosticDetail(message)}</pre></details>
  <button onClick={onRetry}>{t('重试保存','Retry save')}</button>
 </section>
}
