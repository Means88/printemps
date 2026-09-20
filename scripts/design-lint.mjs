// Design-system lint for a plain-CSS renderer: the mechanical half of docs/DESIGN.md.
// Rules (names follow @shadcn/lint so reports read the same way):
//   no-raw-colors        — #hex / rgb() outside src/renderer/tokens.css
//   no-arbitrary-values  — font-size / border-radius / gap / padding / margin px values off the scale
//   no-raw-motion        — transition/animation durations or cubic-bezier written as literals
//   no-inline-styles     — TSX style={{}} with a theme colour literal (geometry and data colours are allowed)
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve(new URL('..',import.meta.url).pathname)
const css=fs.readFileSync(path.join(root,'src/renderer/style.css'),'utf8')
const typeScale=new Set([11,12,13,14,16,18,20,22,30])
const radiusScale=new Set([0,3,8,10,12,16,999])
const spaceScale=new Set([0,1,2,3,4,5,6,8,10,12,14,16,18,20,22,24,28,32,40,48,64,72,80])
const findings=[]
const lines=css.split('\n')
lines.forEach((line,i)=>{
 const n=i+1
 for(const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g))findings.push({rule:'no-raw-colors',file:'src/renderer/style.css',line:n,detail:m[0]})
 for(const m of line.matchAll(/font-size:\s*([0-9.]+)px/g))if(!typeScale.has(Number(m[1])))findings.push({rule:'no-arbitrary-values',file:'src/renderer/style.css',line:n,detail:`font-size ${m[1]}px`})
 for(const m of line.matchAll(/\bfont:\s*(?:[a-z0-9 ]*?)([0-9.]+)px/g))if(!typeScale.has(Number(m[1])))findings.push({rule:'no-arbitrary-values',file:'src/renderer/style.css',line:n,detail:`font ${m[1]}px`})
 for(const m of line.matchAll(/border-radius:\s*([0-9.]+)px/g))if(!radiusScale.has(Number(m[1])))findings.push({rule:'no-arbitrary-values',file:'src/renderer/style.css',line:n,detail:`border-radius ${m[1]}px`})
 for(const m of line.matchAll(/\b(gap|padding|margin)(?:-[a-z]+)?:\s*([^;}]+)/g)){for(const v of m[2].matchAll(/(-?[0-9.]+)px/g)){const px=Math.abs(Number(v[1]));if(!spaceScale.has(px))findings.push({rule:'no-arbitrary-values',file:'src/renderer/style.css',line:n,detail:`${m[1]} ${v[1]}px`})}}
 for(const m of line.matchAll(/(transition|animation)[^;}]*?(\d*\.?\d+m?s)/g))if(!/var\(--dur/.test(m[0])&&!/\b0m?s\b/.test(m[2]))findings.push({rule:'no-raw-motion',file:'src/renderer/style.css',line:n,detail:m[0].slice(0,60)})
 for(const m of line.matchAll(/cubic-bezier\(/g))findings.push({rule:'no-raw-motion',file:'src/renderer/style.css',line:n,detail:'cubic-bezier literal'})
})
for(const file of fs.readdirSync(path.join(root,'src/renderer')).filter(f=>f.endsWith('.tsx'))){
 const src=fs.readFileSync(path.join(root,'src/renderer',file),'utf8')
 src.split('\n').forEach((line,i)=>{for(const m of line.matchAll(/style=\{\{[^}]*#[0-9a-fA-F]{3,8}\b[^}]*\}\}/g))findings.push({rule:'no-inline-styles',file:`src/renderer/${file}`,line:i+1,detail:m[0].slice(0,80)})})
}
const byRule={};for(const f of findings)byRule[f.rule]=(byRule[f.rule]||0)+1
const verbose=process.argv.includes('--verbose')
for(const f of verbose?findings:findings.slice(0,40))console.log(`${f.file}:${f.line}  ${f.rule}  ${f.detail}`)
if(findings.length>40&&!verbose)console.log(`… ${findings.length-40} more (run with --verbose)`)
console.log(JSON.stringify({total:findings.length,byRule}))
process.exit(findings.length?1:0)
