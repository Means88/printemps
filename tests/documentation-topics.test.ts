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
