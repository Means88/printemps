import {Menu,app,type MenuItemConstructorOptions as Item} from 'electron'
import {initialMenuState,type MenuState,type MenuCommand} from '../shared/native-menu'
export function menuTemplate(s:MenuState,send:(command:MenuCommand)=>void,platform=process.platform):Item[]{
 const mac=platform==='darwin',t=(zh:string,en:string)=>s.language==='en'?en:zh,active=s.project&&!s.blocked
 const command=(id:MenuCommand,zh:string,en:string,enabled=!s.blocked,accelerator?:string,checked?:boolean):Item=>({id,label:t(zh,en),enabled,accelerator,...(checked===undefined?{}:{type:'checkbox',checked}),click:()=>send(id)})
 const settings=command('settings','设置…','Settings…',!s.blocked,'CmdOrCtrl+,')
 const about:Item={label:t('关于 Printemps','About Printemps'),click:()=>app.showAboutPanel()}
 const sep:Item={type:'separator'}
 return [
 ...(mac?[{label:'Printemps',submenu:[about,sep,settings,sep,{role:'services',label:t('服务','Services')},sep,{role:'hide',label:t('隐藏 Printemps','Hide Printemps')},{role:'hideOthers',label:t('隐藏其它','Hide Others')},{role:'unhide',label:t('显示全部','Show All')},sep,{role:'quit',label:t('退出 Printemps','Quit Printemps')}]} as Item]:[]),
 {label:t('文件','File'),submenu:[command('import','导入音频…','Import audio…',!s.blocked,'CmdOrCtrl+O'),command('history','全部项目','All projects',!s.blocked,'CmdOrCtrl+Shift+O'),sep,command('export','导出音轨…','Export tracks…',active,'CmdOrCtrl+Shift+E'),sep,{role:'close',label:t('关闭窗口','Close window')},...(!mac?[{role:'quit',label:t('退出','Quit')} as Item]:[])]},
 {label:t('编辑','Edit'),submenu:[{role:'undo',label:t('撤销','Undo')},{role:'redo',label:t('重做','Redo')},sep,{role:'cut',label:t('剪切','Cut')},{role:'copy',label:t('复制','Copy')},{role:'paste',label:t('粘贴','Paste')},{role:'selectAll',label:t('全选','Select all')}]},
 {label:t('播放','Playback'),submenu:[command('play',s.playing?'暂停':'播放',s.playing?'Pause':'Play',active),command('start','返回起点','Return to start',active),sep,command('loop','循环','Loop',active,undefined,s.loop),command('in','设置入点','Set in',active),command('out','设置出点','Set out',active),sep,command('metronome','节拍器','Metronome',active&&s.hasBpm,undefined,s.metronome)]},
 {label:t('音轨','Tracks'),submenu:[command('tracks','所有音轨…','All tracks…',active,'CmdOrCtrl+Shift+T'),command('separate','分离所选音轨…','Separate selected track…',active&&s.canSeparate),command('music','节奏与调性…','Rhythm and key…',active)]},
 {label:t('视图','View'),submenu:[command('zoomIn','放大时间轴','Zoom timeline in',active),command('zoomOut','缩小时间轴','Zoom timeline out',active),command('fit','显示完整音频','Fit audio',active),sep,command('inspector','音轨详情','Track details',active,undefined,s.inspector),sep,{role:'togglefullscreen',label:t('全屏','Full screen')}]},
 {label:t('工具','Tools'),submenu:[command('models','模型管理…','Model library…'),...(!mac?[settings]:[])]},
 {label:t('窗口','Window'),submenu:[{role:'minimize',label:t('最小化','Minimize')},{role:'zoom',label:t('缩放窗口','Zoom window')},...(mac?[{role:'front',label:t('全部置于前台','Bring All to Front')} as Item]:[])]},
 {label:t('帮助','Help'),submenu:[command('shortcuts','快捷键…','Keyboard shortcuts…'),...(!mac?[about]:[])]}
 ]
}
export function installNativeMenu(send:(command:MenuCommand)=>void){let last='';return (state:MenuState=initialMenuState)=>{const key=JSON.stringify(state);if(key===last)return;last=key;app.setAboutPanelOptions({applicationName:'Printemps',applicationVersion:app.getVersion()});Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(state,send)))}}
