#!/usr/bin/env node
// 全言語の出力 HTML に対し、SSR 時点で残存すべきでない英語 UI 文言の
// 洗い出しと、各言語訳の存在確認を行う検証スクリプト。
import fs from 'node:fs'
import path from 'node:path'
import { LOCALES } from '../lib/langs.mjs'
import { UI_I18N } from '../lib/ui-i18n.mjs'

const outDir = process.argv[2] ?? 'out'
// SSR 時点で存在してはならない英語 UI 文言 (UiTranslator が hydration 後に
// 翻訳する title/aria 属性は SSR では英語のまま残るため対象外)
const FORBIDDEN = [
  'On This Page',
  'Scroll to top',
  'Question? Give us feedback',
  'Copy page as Markdown',
  'Open in ChatGPT',
  'Open in Claude',
  'Ask questions about this page',
  '>Copy page</button>',
  'aria-label="Project repository"',
  'title="Copy page"'
]

let failed = false
for (const { code } of LOCALES) {
  const page = path.join(outDir, code, 'api', 'hooks', 'index.html')
  if (!fs.existsSync(page)) {
    console.log(`${code}: [WARN] sample page missing (${page})`)
    continue
  }
  const html = fs.readFileSync(page, 'utf8')
  const dict = UI_I18N[code]

  // en は英語 UI が正解のため英語残存チェックは対象外
  const hits = code === 'en' ? [] : FORBIDDEN.filter(s => html.includes(s))
  const missing = [
    dict.tocTitle,
    dict.backToTop,
    dict.feedbackContent,
    dict.themeSystem,
    dict.themeDark,
    code === 'en' ? 'Copy page' : dict.copyPage
  ].filter(s => !html.includes(s))

  const notFound = fs.existsSync(path.join(outDir, code, '404.html'))
    ? fs.readFileSync(path.join(outDir, code, '404.html'), 'utf8')
    : ''
  const nfOk = code === 'en'
    ? notFound.includes('This page could not be found.')
    : notFound.includes(dict.notFound) && notFound.includes(`lang="${code}"`)
  // en はルート 404 のみ (言語ディレクトリ内 404 は持たない)
  const nfSkip = code === 'en' && !fs.existsSync(path.join(outDir, 'en', '404.html'))

  const status = !hits.length && !missing.length && (nfOk || nfSkip) ? 'OK' : 'FAIL'
  if (status === 'FAIL') failed = true
  console.log(
    `${code}: ${status}` +
    (hits.length ? ` | 英語残存: ${hits.join(', ')}` : '') +
    (missing.length ? ` | 訳が無い: ${missing.join(', ')}` : '') +
    (nfSkip ? ' | 404: root only' : nfOk ? ' | 404 OK' : ' | 404 FAIL')
  )
}
process.exit(failed ? 1 : 0)
