export const stemCategories={all:['全部','All'],voice:['人声','Vocals'],guitar:['吉他与拨弦','Guitars & plucked'],keys:['键盘与合成器','Keys & synths'],rhythm:['鼓与打击乐','Drums & percussion'],strings:['弦乐','Strings'],wind:['管乐','Winds']} as const
export type StemCategory=keyof typeof stemCategories
const names:Record<string,[string,string,Exclude<StemCategory,'all'>]>={
 accordion:['手风琴','Accordion','keys'], 'acoustic-guitar':['木吉他','Acoustic guitar','guitar'], 'back-vocal':['和声','Backing vocals','voice'],
 banjo:['班卓琴','Banjo','guitar'],bass:['贝斯','Bass','guitar'],bassoon:['巴松管','Bassoon','wind'],bells:['钟铃','Bells','rhythm'],bowed_strings:['弓弦乐器','Bowed strings','strings'],brass:['铜管','Brass','wind'],cello:['大提琴','Cello','strings'],clarinet:['单簧管','Clarinet','wind'],congas:['康加鼓','Congas','rhythm'],
 'digital-piano':['电钢琴','Digital piano','keys'],dobro:['共鸣吉他','Dobro','guitar'],'double-bass':['低音提琴','Double bass','strings'],drums:['鼓组','Drums','rhythm'],'electric-guitar':['电吉他','Electric guitar','guitar'],flute:['长笛','Flute','wind'],'french-horn':['圆号','French horn','wind'],glockenspiel:['钟琴','Glockenspiel','rhythm'],guitar:['吉他','Guitar','guitar'],harmonica:['口琴','Harmonica','wind'],harp:['竖琴','Harp','strings'],harpsichord:['羽管键琴','Harpsichord','keys'],hh:['踩镲','Hi-hat','rhythm'],keys:['键盘','Keys','keys'],kick:['底鼓','Kick drum','rhythm'],'lead-vocal':['主唱','Lead vocals','voice'],mandolin:['曼陀林','Mandolin','guitar'],marimba:['马林巴','Marimba','rhythm'],oboe:['双簧管','Oboe','wind'],organ:['风琴','Organ','keys'],percussion:['打击乐','Percussion','rhythm'],piano:['钢琴','Piano','keys'],saxophone:['萨克斯','Saxophone','wind'],sitar:['西塔琴','Sitar','guitar'],snare:['军鼓','Snare drum','rhythm'],strings:['弦乐组','Strings','strings'],synth:['合成器','Synthesizer','keys'],tambourine:['铃鼓','Tambourine','rhythm'],timpani:['定音鼓','Timpani','rhythm'],toms:['通鼓','Toms','rhythm'],triangle:['三角铁','Triangle','rhythm'],trombone:['长号','Trombone','wind'],trumpet:['小号','Trumpet','wind'],tuba:['大号','Tuba','wind'],ukulele:['尤克里里','Ukulele','guitar'],viola:['中提琴','Viola','strings'],violin:['小提琴','Violin','strings'],vocal:['人声','Vocals','voice'],'wind-chimes':['风铃','Wind chimes','rhythm'],wind:['管乐组','Wind instruments','wind'],woodwind:['木管','Woodwinds','wind']
}
export function stemLabel(id:string,en=false){return id==='other'?(en?'Other':'其它'):id==='original'?(en?'Original':'原始音频'):names[id]?.[en?1:0]||id}
// Persist instrument colors by identity, independent of selection/extraction order.
const colors:Record<string,string>={
 original:'#9aaabb',other:'#4dd6ba',
 vocal:'#b395e6','lead-vocal':'#ad91e4','back-vocal':'#d0a1ed',
 bass:'#51c3b6','acoustic-guitar':'#91bfe8','electric-guitar':'#6caff0',guitar:'#77a0e5',
 banjo:'#99c6db',dobro:'#78bbc9',mandolin:'#89aed6',sitar:'#729cc2',ukulele:'#a3d0e6',
 accordion:'#dca4c8','digital-piano':'#d68cb0',harpsichord:'#f0b4d6',keys:'#d994d0',organ:'#c496d8',piano:'#ed91b7',synth:'#bc8dec',
 drums:'#e7b65f',bells:'#e8cf8b',congas:'#dca17b',glockenspiel:'#f2d69c',hh:'#d7c56d',kick:'#df9c5b',marimba:'#d7af7f',percussion:'#dbbd89',snare:'#edb583',tambourine:'#d8cf90',timpani:'#c9a46e',toms:'#e5a66a',triangle:'#f0dda6','wind-chimes':'#d9d5a1',
 bowed_strings:'#a8c984',cello:'#89b97c','double-bass':'#6eb58e',harp:'#c2d88f',strings:'#9acb72',viola:'#a1bd87',violin:'#b3d481',
 bassoon:'#6eabb2',brass:'#74b8d1',clarinet:'#89b9b7',flute:'#8ed2d0','french-horn':'#87adc9',harmonica:'#a0c4d0',oboe:'#75b9bb',saxophone:'#80c1c9',trombone:'#78a9c7',trumpet:'#90c4e0',tuba:'#6ba4ba',wind:'#86cbd4',woodwind:'#a1cfc6'
}
export function stemColor(id:string){return colors[id]??colors.other}
export function matchesStem(id:string,query:string,category:StemCategory='all'){
 const item=names[id]
 if(category!=='all'&&item?.[2]!==category)return false
 const searchable=[id.replaceAll(/[-_]/g,' '),id,...(item||[])].join(' ').toLocaleLowerCase()
 return query.trim().toLocaleLowerCase().split(/\s+/).every(word=>searchable.includes(word))
}
export const stemPresets=[
 {id:'band',zh:'乐队',en:'Band',stems:['vocal','drums','bass','guitar']},
 {id:'voice',zh:'主唱与和声',en:'Lead & backing',stems:['lead-vocal','back-vocal']},
 {id:'drum-kit',zh:'鼓组细分',en:'Drum parts',stems:['kick','snare','hh','toms']}
]
/** Add presets without losing hidden selections or changing existing extraction order. */
export function addStemSelection(selected:string[],ids:string[]){return [...new Set([...selected,...ids])]}
export function formatModelBytes(bytes:number){return `${(bytes/1_000_000).toFixed(1)} MB`}
