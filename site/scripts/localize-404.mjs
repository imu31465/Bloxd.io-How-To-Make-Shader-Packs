#!/usr/bin/env node
// 言語別 404 ページ生成。
//
// GitHub Pages は存在しないパスに対して「パスから見て最も近い」404.html を
// 返す (/ja/missing → /ja/404.html、無ければルートの 404.html)。
// Next.js の静的書き出しはルートの 404.html (英語) しか出力しないため、
// これを各言語ディレクトリへ複製し、文言と <html lang> を差し替える。
//
// 「This page could not be found.」は <title>・<h2>・インライン RSC ペイロード
// のすべてに出現するが、replaceAll で全部置換するため、ハイドレーション時の
// DOM とペイロードの整合も保たれる。
import fs from 'node:fs'
import path from 'node:path'
import { LOCALES } from '../lib/langs.mjs'
import { UI_I18N } from '../lib/ui-i18n.mjs'

const outDir = process.argv[2] ?? 'out'
const src = path.join(outDir, '404.html')

if (!fs.existsSync(src)) {
  console.log('localize-404: 404.html not found, skipping')
  process.exit(0)
}

const base = fs.readFileSync(src, 'utf8')
const EN_TEXT = UI_I18N.en.notFound

let count = 0
for (const { code } of LOCALES) {
  if (code === 'en') continue
  const dict = UI_I18N[code]
  const langDir = path.join(outDir, code)
  if (!fs.existsSync(langDir)) continue

  let html = base
  html = html.replaceAll(EN_TEXT, dict.notFound)
  html = html.replace(/(<html[^>]*?lang=)"en"/, `$1"${code}"`)

  fs.writeFileSync(path.join(langDir, '404.html'), html)
  count++
}

console.log(`localize-404: wrote ${count} localized 404 pages`)
