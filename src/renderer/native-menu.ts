import {useEffect} from 'react'
import type {MenuCommand} from '../shared/native-menu'
export function useMenuCommand(command:MenuCommand,action:()=>void){useEffect(()=>{const onCommand=(e:Event)=>{if((e as CustomEvent<MenuCommand>).detail===command&&!document.querySelector('[role="dialog"][data-state="open"]'))action()};window.addEventListener('printemps:menu',onCommand);return()=>window.removeEventListener('printemps:menu',onCommand)},[command,action])}
