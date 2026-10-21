#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES } from '../lib/langs.mjs'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(siteRoot, '..')
const contentRoot = path.join(siteRoot, 'content')

const EXCLUDED = new Set(['00-full.md'])

function titleOf(src, fallback) {
  const match = src.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : fallback
}

function yamlQuote(value) {
  return `'${value.replace(/'/g, "''")}'`
}

// 同ファイル間の相対リンクは、ページの深さ (index と各部で階層が違う) に左右されない
// 言語ルートからの絶対パスに置き換える (basePath は Next Link 側が付与するため含めない)
function rewriteLinks(src, code) {
  const prefix = `/${code}`
  return src
    // 掲載対象外の全文一括版 (00-full.md) へのリンクは、リンクだけ剥がして文字は残す
    .replace(/\[([^\]]*)\]\(0?0-full\.md(?:#[^\s()]*|)\)/g, '$1')
    .replace(/\]\(([^()\s]+\.md)(#[^\s()]*)?\)/g, (full, file, anchor = '') => {
    if (/^(https?:)?\/\//i.test(file) || file.startsWith('/')) return full
    const base = file === 'README.md' ? '' : `${file.replace(/\.md$/, '')}/`
    return `](${prefix}/${base}${anchor})`
  })
}

function escapeLine(line) {
  const parts = line.split(/(`[^`\n]*`)/)
  return parts
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/([{}<])/g, '\\$1')
    )
    .join('')
}

function transform(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  let inFence = false
  const out = lines.map(line => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    return inFence ? line : escapeLine(line)
  })
  return out.join('\n')
}

function withFrontmatter(text, title) {
  return `---\ntitle: ${yamlQuote(title)}\n---\n\n${text}`
}

fs.rmSync(contentRoot, { recursive: true, force: true })
fs.mkdirSync(contentRoot, { recursive: true })

let files = 0
for (const { code } of LOCALES) {
  const srcDir = path.join(repoRoot, code)
  const outDir = path.join(contentRoot, code)
  const meta = {}
  for (const file of fs.readdirSync(srcDir)) {
    if (!/\.mdx?$/.test(file)) continue
    if (EXCLUDED.has(file)) continue
    const src = fs.readFileSync(path.join(srcDir, file), 'utf8')
    const title = titleOf(src, file)
    const base = file === 'README.md' ? 'index' : file.replace(/\.[^.]+$/, '')
    const outName = file === 'README.md' ? 'index.md' : file
    const text = withFrontmatter(transform(rewriteLinks(src, code)), title)
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, outName), text)
    meta[base] =
      base === 'index'
        ? { title, theme: { toc: false, typesetting: 'article' } }
        : title
    files++
  }
  fs.writeFileSync(
    path.join(outDir, '_meta.json'),
    JSON.stringify(meta, null, 2) + '\n'
  )
}
console.log(`sync: wrote ${files} pages for ${LOCALES.length} locales -> ${contentRoot}`)
