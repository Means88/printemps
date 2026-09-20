/** Clamp a page after filtering, deletion, or restoration changes the list. */
export function paginate<T>(items:readonly T[],requestedPage:number,pageSize=8){
 const size=Math.max(1,Math.floor(pageSize))
 const pages=Math.max(1,Math.ceil(items.length/size))
 const page=Math.min(pages-1,Math.max(0,Math.floor(requestedPage)))
 const start=page*size
 return {page,pages,items:items.slice(start,start+size),from:items.length?start+1:0,to:Math.min(start+size,items.length),total:items.length}
}
