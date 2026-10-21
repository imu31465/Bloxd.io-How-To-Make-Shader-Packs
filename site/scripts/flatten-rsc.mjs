import { readdirSync, statSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Next 16 static export writes RSC segment payload files preserving the
// segment-tree directory layout (e.g. ja/01-making/__next.$d$lang/$oc$mdxPath/__PAGE__.txt),
// while the client router requests them flattened with dots
// (ja/01-making/__next.$d$lang.$oc$mdxPath.__PAGE__.txt).
// This script flattens all nested "__next.*" segment trees in out/ so the
// client prefetch URLs resolve.

const outDir = process.argv[2] ?? 'out'

function flatten(nextDir) {
  const parent = nextDir.replace(/[/\\]__next\..+$/, '')
  const prefix = nextDir.slice(parent.length + 1).replace(/^__next\./, '')
  const stack = [nextDir]
  while (stack.length) {
    const dir = stack.pop()
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        stack.push(full)
        continue
      }
      const rel = relative(nextDir, full).split(sep).join('.')
      const flat = `${parent}${sep}${prefix ? `__next.${prefix}.` : ''}${rel}`
      writeFileSync(flat, readFileSync(full))
    }
  }
  rmSync(nextDir, { recursive: true })
}

let processed = 0
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (/^__next\./.test(name)) {
        flatten(full)
        processed++
        continue
      }
      walk(full)
    }
  }
}
walk(outDir)
console.log(`flatten-rsc: flattened ${processed} segment trees in ${outDir}`)
