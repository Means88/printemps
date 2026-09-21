import {test,expect} from 'vitest'
import {readFileSync} from 'node:fs'

// The renderer may only name a topic; main maps it to a URL. Both sides and the page must agree.
test('every documentation topic resolves to an anchor that exists in both languages',()=>{
 const main=readFileSync('src/main/index.ts','utf8')
 const block=main.match(/const DOCUMENTATION:Record<string,string>=\{([^}]*)\}/)
 expect(block).not.toBeNull()
 const sections=[...block![1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(m=>({topic:m[1],section:m[2]}))
 expect(sections.length).toBeGreaterThan(0)

 const guide=readFileSync('site/guide.html','utf8')
 for(const {topic,section} of sections){
  for(const language of ['zh','en']) expect(guide,`${topic} -> ${language}-${section}`).toContain(`id="${language}-${section}"`)
  // The renderer must actually ask for a topic main knows about.
  expect(readFileSync('src/renderer/preferences.tsx','utf8')).toContain(`openDocumentation('${topic}')`)
 }
 // A deep link carries the language, and the page has to honour it or the target stays hidden.
 expect(guide).toContain('location.hash.match(/^#(zh|en)-/)')
})

// The guide offers both shells. PowerShell needs $env: expansion and the call operator for a
// quoted executable; cmd needs %VAR% and must not carry the call operator.
test('each Windows command is offered in both shells with the right syntax',()=>{
 const guide=readFileSync('site/guide.html','utf8')
 const blocks=[...guide.matchAll(/<pre data-shell="(powershell|cmd)"><code>([\s\S]*?)<\/code><\/pre>/g)]
  .map(m=>({shell:m[1],body:m[2]})).filter(b=>/printemps-cuda/.test(b.body))
 const powershell=blocks.filter(b=>b.shell==='powershell')
 const cmd=blocks.filter(b=>b.shell==='cmd')
 expect(powershell.length).toBeGreaterThan(0)
 // Every command exists in both shells, in both languages.
 expect(cmd.length).toBe(powershell.length)
 for(const {body} of powershell){
  expect(body,`cmd-style expansion in PowerShell: ${body}`).not.toMatch(/%[A-Z_]+%/)
  if(/Scripts\\[^\s"]*\.exe/.test(body))expect(body.trim(),`needs the call operator: ${body}`).toMatch(/^&amp;\s+"/)
 }
 for(const {body} of cmd){
  expect(body,`PowerShell expansion in cmd: ${body}`).not.toContain('$env:')
  expect(body.trim(),`cmd does not take the call operator: ${body}`).not.toMatch(/^&amp;/)
 }
 // The switch and its persistence have to be present or one shell is unreachable.
 expect(guide).toContain('data-shell-pick="powershell"')
 expect(guide).toContain('data-shell-pick="cmd"')
 expect(guide).toContain("localStorage.getItem(shellKey)")
 // Readers are not assumed to know how to open a terminal, so each shell carries its own how-to.
 for(const shell of ['powershell','cmd']) expect(guide.match(new RegExp(`<span data-shell="${shell}">`,'g'))?.length,shell).toBe(2)
 // Win+R is the method that does not vary with the Windows version or display language.
 expect(guide).toContain('Windows 键')
 expect(guide).toContain('Windows key')
 expect(guide.match(/<strong>R<\/strong>/g)?.length).toBe(4)
 // Long commands are copied, not retyped.
 expect(guide).toContain("button.className='copy'")
})
