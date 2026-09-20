export function importGuidance(message:string,en:boolean){
 const t=(zh:string,english:string)=>en?english:zh
 if(/ENOSPC|no space left|insufficient disk/i.test(message))return t('磁盘空间不足，请释放空间后重新选择音频。','Not enough disk space. Free space, then choose the audio again.')
 if(/EACCES|EPERM|permission denied|read.only/i.test(message))return t('无法读取音频或写入项目目录，请检查访问权限。','Cannot read the audio or write the project folder. Check access permissions.')
 if(/ENOENT|no such file/i.test(message))return t('找不到音频文件，请重新选择。','The audio file could not be found. Choose it again.')
 if(/invalid data|unsupported|no audio|decod/i.test(message))return t('音频损坏或格式不受支持，请选择其它音频。','The audio is damaged or unsupported. Choose another file.')
 return t('导入未完成，请重新选择音频后重试。','Import did not complete. Choose the audio again to retry.')
}
export function ImportRecovery({message,en,busy,onChoose}:{message:string;en:boolean;busy:boolean;onChoose:()=>void}){
 const t=(zh:string,english:string)=>en?english:zh
 return <section className="save-recovery" aria-label={t('无法导入','Cannot import')}>
  <p role="alert">{t('无法导入','Cannot import')} · {importGuidance(message,en)}</p>
  <details><summary>{t('技术详情','Technical details')}</summary><pre>{message}</pre></details>
  <button disabled={busy} onClick={onChoose}>{t('选择其它音频','Choose another file')}</button>
 </section>
}
