import {test,expect} from 'vitest'
import {paginate} from '../src/shared/pagination'
test('deleting the final item of the last page falls back to the previous populated page',()=>{
 const items=Array.from({length:17},(_,i)=>i)
 expect(paginate(items,2).items).toEqual([16])
 const after=paginate(items.slice(0,16),2)
 expect(after.page).toBe(1)
 expect(after.items).toEqual([8,9,10,11,12,13,14,15])
 expect([after.from,after.to,after.total]).toEqual([9,16,16])
})
test('empty searches and reduced result sets have valid page boundaries',()=>{
 expect(paginate([],9)).toEqual({page:0,pages:1,items:[],from:0,to:0,total:0})
 expect(paginate(['match'],9).items).toEqual(['match'])
 expect(paginate(['match'],-1).page).toBe(0)
})
