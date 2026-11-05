#!/usr/bin/env node
// 言語別 404 ページ生成。
//
// GitHub Pages は存在しないパスに対して「ルートの」404.html だけを返す
// (サブディレクトリの 404.html は認識されない)。そのため:
//
//   1. Next.js が出力したルートの 404.html (英語) を各言語ディレクトリへ
//      複製し、文言と <html lang> を差し替える (直接 URL を開けば各言語版
//      が 200 で表示できる)
//   2. ルートの 404.html にインラインスクリプトを注入し、パスの言語
//      プレフィックスを検出して各言語の 404 へリダイレクトする
//
// 「This page could not be found.」は <title>・<h2>・インライン RSC ペイ
// ロードのすべてに出現するが、replaceAll で全部置換するため、ハイドレー
// ション時の DOM とペイロードの整合も保たれる。
//
// 注意: ルートへの注入は「各言語コピーの生成後」に行うこと。コピーにリダ
// イレクトスクリプトが継承されると自分自身へリダイレクトし続ける。
import fs from 'node:fs'
import path from 'node:path'
import { LOCALES } from '../lib/langs.mjs'
import { UI_I18N } from '../lib/ui-i18n.mjs'
import { basePath } from '../lib/paths.mjs'

const outDir = process.argv[2] ?? 'out'
const src = path.join(outDir, '404.html')

if (!fs.existsSync(src)) {
  console.log('localize-404: 404.html not found, skipping')
  process.exit(0)
}

const base = fs.readFileSync(src, 'utf8')
const EN_TEXT = UI_I18N.en.notFound

// ---- 1. 各言語ディレクトリへコピー (言語差し替えのみ・リダイレクトなし) ----
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

// ---- 2. ルート 404.html に言語判定リダイレクトを注入 ----
const redirectLangs = LOCALES.map(l => l.code).filter(c => c !== 'en')
const script =
  '<script>' +
  '(function(){' +
  // 404.html 自体が直接開かれた場合は何もしない (自己リダイレクト防止)
  'if(/\\/404\\.html$/.test(location.pathname))return;' +
  `var m=location.pathname.match(/^${basePath.replace(/\//g, '\\/')}\\/([a-z]{2}(?:-[A-Za-z]{2})?)(\\/|$)/);` +
  'var lang=m&&m[1];' +
  `var langs=${JSON.stringify(redirectLangs)};` +
  'if(lang&&langs.indexOf(lang)!==-1){' +
  `location.replace('${basePath}/'+lang+'/404.html');` +
  '}' +
  '})();' +
  '</script>'

if (!base.includes('location.replace')) {
  let html = base
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>' + script)
  } else {
    html = script + html
  }
  fs.writeFileSync(src, html)
  console.log('localize-404: injected language redirect into root 404.html')
}
