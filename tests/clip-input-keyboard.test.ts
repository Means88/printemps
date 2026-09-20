import {describe,it,expect,vi} from 'vitest'
import type {ReactElement} from 'react'
import {ClipDetails} from '../src/renderer/clip-details'
import {isCompositionKey,preserveCompositionEscape} from '../src/renderer/keyboard'
import {acceptsShortcut} from '../src/renderer/shortcuts'
import type {Track} from '../src/shared/domain'
const clip={id:'clip',name:'主唱',start:0,end:10,offset:2}
const track={id:'track',name:'声部',color:'#abc',clips:[clip]} as Track
function inputs(node:unknown):ReactElement<any>[] {
 if(Array.isArray(node))return node.flatMap(inputs)
 if(!node||typeof node!=='object'||!('props' in node))return []
 const element=node as ReactElement<any>
 return element.type==='input'?[element]:inputs(element.props.children)
}
describe('clip keyboard editing',()=>{
 it('keeps candidate confirmation and cancellation inside the IME for name and trim fields',()=>{
  const fields=inputs(ClipDetails({track,clip,en:false,disabled:false,onEdit:vi.fn()}))
  expect(fields).toHaveLength(3)
  for(const input of fields)for(const key of ['Enter','Escape'])for(const nativeEvent of [{isComposing:true,keyCode:13},{isComposing:false,keyCode:229}]){
   const target={value:'中文候选',blur:vi.fn()}
   input.props.onKeyDown({key,nativeEvent,currentTarget:target})
   expect(target.blur).not.toHaveBeenCalled()
   expect(target.value).toBe('中文候选')
  }
 })
 it('commits a finished name with Enter and restores the original name on Escape',()=>{
  const edit=vi.fn(),field=inputs(ClipDetails({track,clip,en:false,disabled:false,onEdit:edit}))[0]
  const target={value:'主唱副歌',blur:vi.fn(()=>field.props.onBlur({target,currentTarget:target}))}
  const nativeEvent={isComposing:false,keyCode:13}
  field.props.onKeyDown({key:'Enter',nativeEvent,currentTarget:target})
  expect(edit).toHaveBeenCalledWith(expect.objectContaining({kind:'rename',name:'主唱副歌'}))
  edit.mockClear();target.value='未保存'
  field.props.onKeyDown({key:'Escape',nativeEvent,currentTarget:target})
  expect(target.value).toBe('主唱');expect(edit).not.toHaveBeenCalled()
 })
 it('prevents dialog dismissal only while the IME owns Escape',()=>{
  for(const composing of [true,false]){
   const preventDefault=vi.fn()
   preserveCompositionEscape({isComposing:composing,keyCode:27,preventDefault} as unknown as KeyboardEvent)
   expect(preventDefault).toHaveBeenCalledTimes(composing?1:0)
  }
 })
 it('keeps playback shortcuts out of composition and editable fields',()=>{
  const event={defaultPrevented:false,repeat:false,isComposing:false,keyCode:32,altKey:false,ctrlKey:false,metaKey:false,target:null} as KeyboardEvent
  expect(acceptsShortcut(event,false)).toBe(true)
  expect(acceptsShortcut({...event,keyCode:229},false)).toBe(false)
  expect(acceptsShortcut({...event,isComposing:true},false)).toBe(false)
  expect(acceptsShortcut(event,true)).toBe(false)
  expect(acceptsShortcut({...event,target:{closest:()=>({})}} as unknown as KeyboardEvent,false)).toBe(false)
 })
 it('allows ordinary keys after composition ends',()=>{
  expect(isCompositionKey({isComposing:false,keyCode:13})).toBe(false)
  expect(isCompositionKey({isComposing:false,keyCode:32})).toBe(false)
 })
})
