import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({Menu:{},app:{showAboutPanel:vi.fn()}}))
import {menuTemplate} from '../src/main/native-menu'
import {initialMenuState,type MenuCommand} from '../src/shared/native-menu'
import type {MenuItemConstructorOptions as Item} from 'electron'
const flatten=(items:Item[]):Item[]=>items.flatMap(i=>[i,...(Array.isArray(i.submenu)?flatten(i.submenu as Item[]):[])])
describe('native menus',()=>{
 it('disables project actions at home and all custom actions in dialogs',()=>{
  const home=flatten(menuTemplate({...initialMenuState,blocked:false},()=>{},'win32'))
  expect(home.find(i=>i.id==='import')?.enabled).toBe(true)
  for(const id of ['play','export','tracks','music','separate'])expect(home.find(i=>i.id===id)?.enabled).toBe(false)
  const modal=flatten(menuTemplate({...initialMenuState,project:true,blocked:true},()=>{}))
  expect(modal.filter(i=>i.id).every(i=>i.enabled===false)).toBe(true)
 })
 it('routes actions and reflects playback, metronome and inspector state without single-key accelerators',()=>{
  const send=vi.fn<(c:MenuCommand)=>void>()
  const items=flatten(menuTemplate({...initialMenuState,blocked:false,project:true,playing:true,loop:true,hasBpm:true,metronome:true,canSeparate:true,language:'en'},send))
  expect(items.find(i=>i.id==='play')?.label).toBe('Pause')
  for(const id of ['loop','metronome','inspector'])expect(items.find(i=>i.id===id)?.checked).toBe(true)
  for(const id of ['play','in','out','loop'])expect(items.find(i=>i.id===id)?.accelerator).toBeUndefined()
  items.find(i=>i.id==='separate')!.click!({} as never,{} as never,{} as never)
  expect(send).toHaveBeenCalledWith('separate')
 })
 it('places preferences and quit in the platform-appropriate menu',()=>{
  const state={...initialMenuState,blocked:false,language:'en' as const}
  const mac=menuTemplate(state,()=>{},'darwin'),win=menuTemplate(state,()=>{},'win32')
  expect(mac[0].label).toBe('Printemps');expect(win[0].label).toBe('File')
  expect(flatten(mac[0].submenu as Item[]).some(i=>i.id==='settings')).toBe(true)
  expect(flatten(win.find(i=>i.label==='Tools')!.submenu as Item[]).some(i=>i.id==='settings')).toBe(true)
 })
})
