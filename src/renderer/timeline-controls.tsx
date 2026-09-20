import {LoopIcon,DividerVerticalIcon} from '@radix-ui/react-icons'
export function TimelineControls({en,zoom,setZoom}:{en:boolean;zoom:number;setZoom:(zoom:number)=>void}){
 return <div className="timeline-navigation"><button aria-label={en?'Zoom out':'缩小时间轴'} title="−" disabled={zoom<=1} onClick={()=>setZoom(Math.max(1,zoom/1.5))}>−</button><button title={en?'Fit audio (0)':'完整音频 (0)'} onClick={()=>setZoom(1)}>{Number(zoom.toFixed(1))}×</button><button aria-label={en?'Zoom in':'放大时间轴'} title="+" disabled={zoom>=16} onClick={()=>setZoom(Math.min(16,zoom*1.5))}>＋</button></div>
}
export function LoopControls({en,enabled,toggle,mark}:{en:boolean;enabled:boolean;toggle:()=>void;mark:(side:'start'|'end')=>void}){
 const t=(a:string,b:string)=>en?b:a
 return <div className="loop-controls"><button aria-pressed={enabled} className={enabled?'selected':''} aria-label={t('循环','Loop')} title={t('循环 (L)','Loop (L)')} onClick={toggle}><LoopIcon/></button><button title={t('设置入点 (I)','Set in (I)')} onClick={()=>mark('start')}><DividerVerticalIcon/>{t('入点','In')}</button><button title={t('设置出点 (O)','Set out (O)')} onClick={()=>mark('end')}>{t('出点','Out')}<DividerVerticalIcon/></button></div>
}
