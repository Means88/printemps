/** Strip Electron IPC wrapper noise so technical details start at the underlying cause. */
export function diagnosticDetail(message:string){
 let text=message.trim()
 for(let guard=0;guard<6;guard++){
  const next=text.replace(/^(?:Error|TypeError|RangeError):\s*/,'').replace(/^Error invoking remote method '[^']*':\s*/,'')
  if(next===text)break
  text=next
 }
 return text||message
}
