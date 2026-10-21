import fs from 'node:fs'
import path from 'node:path'

const outDir = process.argv[2] ?? 'out'
const langs = fs
  .readdirSync(outDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(n => /^[a-z]{2}(-[A-Za-z]{2})*$/.test(n))

let changed = 0
for (const lang of langs) {
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.html')) {
        let html = fs.readFileSync(full, 'utf8')
        const fixed = html.replace(
          /(<html[^>]*?lang=)"en"/,
          `$1"${lang}"`
        )
        if (fixed !== html) {
          fs.writeFileSync(full, fixed)
          changed++
        }
      }
    }
  }
  walk(path.join(outDir, lang))
}
console.log(`fix-html-lang: rewrote lang attr in ${changed} html files`)
