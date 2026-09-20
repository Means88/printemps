// printemps.dev — static release page. Downloads are read from the GitHub Releases API at load time.
const REPO = 'Means88/printemps'
const copy = {
 zh: {eyebrow:'LOCAL STEM SEPARATION',headline:'从一首歌，听见每个声部。',lead:'在你的电脑上用 Roformer 模型分离人声、鼓、贝斯、吉他等声部，逐轨试听、剪辑、导出。音频与结果只留在本机。',other:'其它平台',features:'功能',downloads:'下载',downloadsSub:'安装包来自 GitHub Releases，页面自动读取最新版本。',privacy:'隐私与本地处理',privacyBody:'分析与分离全部在本机完成，音频、剪辑和结果只存放在应用私有目录，导出的文件是独立副本。联网仅用于按需下载模型权重（Hugging Face）与检查应用更新。',navFeatures:'功能',navDownload:'下载',navPrivacy:'隐私',toggle:'EN',get:'下载',releases:'全部版本',notes:'发布说明',license:'许可',credit:'模型致谢：',privacyLink:'阅读完整隐私政策',privacyPolicy:'隐私政策',loading:'正在读取最新版本…',unavailable:'暂时无法读取发布信息，请前往 GitHub Releases 下载。',noAsset:'该平台尚无安装包',
  f:[['声部模型按需下载','只下载你要的声部模型，缓存可管理，后续可加入新模型。'],['非破坏式剪辑','分割、裁剪、只分离选中的片段；结果保留时间轴位置。'],['逐轨试听','在原始音频与分轨之间切换试听，每轨可独奏、静音、调增益；支持循环、节拍器与 BPM/调性分析。'],['独立导出','WAV/FLAC 24-bit；按剪辑范围或按项目时间轴补空白导出。']],
  p:{mac:['macOS','Apple 芯片 · macOS 14 或更高','首次打开需在“系统设置 › 隐私与安全性”放行（尚未公证）。'],win:['Windows','x64 · Windows 10 或更高','SmartScreen 可能提示未知发布者，选择“仍要运行”。'],linux:['Linux','x64 · AppImage','chmod +x 后直接运行；内含 Python 运行时。']},
  primary:{mac:'下载 macOS 版（Apple 芯片）',win:'下载 Windows 版',linux:'下载 Linux 版',none:'前往下载'}},
 en: {eyebrow:'LOCAL STEM SEPARATION',headline:'Hear every part of a song.',lead:'Separate vocals, drums, bass, guitars and more with Roformer models on your own computer, then audition, trim and export each track. Audio and results never leave the machine.',other:'Other platforms',features:'Features',downloads:'Download',downloadsSub:'Installers come from GitHub Releases; this page reads the latest version.',privacy:'Privacy and local processing',privacyBody:'Analysis and separation run entirely on your machine. Audio, clips and results live in the app’s private folder and exports are independent copies. The network is used only to download model weights on demand (Hugging Face) and to check for app updates.',navFeatures:'Features',navDownload:'Download',navPrivacy:'Privacy',toggle:'中文',get:'Download',releases:'All releases',notes:'Release notes',license:'License',credit:'Model credit:',privacyLink:'Read the full privacy policy',privacyPolicy:'Privacy policy',loading:'Reading the latest release…',unavailable:'Release information is unavailable right now. Download from GitHub Releases.',noAsset:'No installer for this platform yet',
  f:[['Stem models on demand','Only the models you pick are fetched and the cache is yours to manage; new models can be added later.'],['Non-destructive clips','Split, trim and separate only the selected clip; results keep their timeline position.'],['Audition per track','Switch between the original and the stems; solo, mute and adjust gain per track, with loop, metronome and BPM/key analysis.'],['Independent exports','24-bit WAV/FLAC; clip range or project-timeline alignment with leading silence.']],
  p:{mac:['macOS','Apple silicon · macOS 14 or later','First launch must be allowed in System Settings › Privacy & Security (not yet notarized).'],win:['Windows','x64 · Windows 10 or later','SmartScreen may warn about an unknown publisher; choose “Run anyway”.'],linux:['Linux','x64 · AppImage','chmod +x and run; the Python runtime is bundled.']},
  primary:{mac:'Download for macOS (Apple silicon)',win:'Download for Windows',linux:'Download for Linux',none:'Go to downloads'}}
}
const detect=()=>{const u=navigator.userAgent;if(/Mac/.test(u)&&!/iPhone|iPad/.test(u))return 'mac';if(/Windows/.test(u))return 'win';if(/Linux/.test(u))return 'linux';return 'none'}
const kind=name=>/\.dmg$/i.test(name)?'mac':/\.exe$/i.test(name)?'win':/\.AppImage$/i.test(name)?'linux':null
const mb=bytes=>`${Math.round(bytes/1048576)} MB`
let lang=(()=>{try{return localStorage.getItem('printemps-lang')}catch{return null}})()||(navigator.language.startsWith('zh')?'zh':'en')
let release=null,assets={},failed=false
function render(){
 const t=copy[lang];document.documentElement.lang=lang==='zh'?'zh-CN':'en'
 for(const el of document.querySelectorAll('[data-t]'))el.textContent=t[el.dataset.t]
 document.querySelectorAll('.feature').forEach((el,i)=>{el.querySelector('h3').textContent=t.f[i][0];el.querySelector('p').textContent=t.f[i][1]})
 for(const key of ['mac','win','linux']){const card=document.querySelector(`.download[data-platform=${key}]`);const [name,req,note]=t.p[key];card.querySelector('h3').textContent=name;card.querySelector('.req').textContent=req;card.querySelector('.note').textContent=note
  const a=assets[key],btn=card.querySelector('.get'),meta=card.querySelector('.meta')
  if(a){btn.href=a.browser_download_url;btn.textContent=`${t.get} · ${mb(a.size)}`;btn.classList.remove('disabled');meta.textContent=a.name}
  else if(release){btn.href=release.html_url;btn.textContent=t.noAsset;meta.textContent='—'}
  else{btn.href=`https://github.com/${REPO}/releases/latest`;btn.textContent=t.get;meta.textContent=t.loading}}
 const os=detect(),primary=document.getElementById('primary');const a=assets[os]
 primary.textContent=t.primary[a?os:'none'];primary.href=a?a.browser_download_url:`https://github.com/${REPO}/releases/latest`
 const status=document.getElementById('status');status.classList.toggle('warn',failed)
 if(release)status.textContent=`${release.tag_name} · ${new Date(release.published_at).toLocaleDateString(lang==='zh'?'zh-CN':'en-GB')} · macOS 14+ · Windows 10+ · Linux x64`
 else status.textContent=failed?t.unavailable:t.loading
 document.getElementById('toggle').textContent=t.toggle
}
document.getElementById('toggle').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('printemps-lang',lang)}catch{}render()})
render()
fetch(`https://api.github.com/repos/${REPO}/releases/latest`,{headers:{Accept:'application/vnd.github+json'}}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(data=>{release=data;for(const a of data.assets||[]){const k=kind(a.name);if(k&&!assets[k])assets[k]=a}render()}).catch(()=>{failed=true;release=null;render()})
