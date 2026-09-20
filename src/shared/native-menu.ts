import {z} from 'zod'
export const menuCommands=['import','history','export','settings','models','shortcuts','play','start','loop','in','out','metronome','tracks','separate','music','zoomIn','zoomOut','fit','inspector'] as const
export type MenuCommand=typeof menuCommands[number]
export const menuStateSchema=z.object({language:z.enum(['zh','en']),project:z.boolean(),blocked:z.boolean(),playing:z.boolean(),loop:z.boolean(),metronome:z.boolean(),hasBpm:z.boolean(),canSeparate:z.boolean(),inspector:z.boolean()}).strict()
export type MenuState=z.infer<typeof menuStateSchema>
export const initialMenuState:MenuState={language:'zh',project:false,blocked:true,playing:false,loop:false,metronome:false,hasBpm:false,canSeparate:false,inspector:true}
