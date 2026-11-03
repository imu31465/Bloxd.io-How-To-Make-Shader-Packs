#!/usr/bin/env node
// md ソース (リポジトリ言語ディレクトリ) -> Nextra content (<lang>/...) への変換。
//
// 2026-11 再構築: 6 分類ディレクトリ構造 (getting-started / api / guides /
// recipes / troubleshooting / internals / history) に対応。
//   - 言語ディレクトリ直下に加えサブディレクトリを再帰処理する
//   - 各ディレクトリの _meta.json (リポジトリ側で管理) を尊重してコピーする
//     (無いディレクトリは従来どおりファイル順で自動生成)
//   - 旧 11 部構成の slug への訪問者を新配置へ案内するリダイレクトページを生成
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES } from '../lib/langs.mjs'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(siteRoot, '..')
const contentRoot = path.join(siteRoot, 'content')

const EXCLUDED = new Set(['00-full.md'])

// 部ファイル先頭・末尾のパンくず (md リンクだけの行: 「← 前の部」「マニュアルに戻る」「次の部 →」等) は
// テーマ内蔵の prev/next ページネーションが担うため、サイト掲載時は剥がす
const NAV_LINE = /^ *\[(?:[^[\]]*)\]\([^)#h/][^)]*\.md\)(?: *[·・] *\[(?:[^[\]]*)\]\([^)#h/][^)]*\.md\))* *$/

// 旧 11 部構成の slug -> 新 URL (言語プレフィックスを除く)。
// 旧 URL からの訪問者を新しい配置先へ案内するページを自動生成する。
const REDIRECTS = {
  '01-making': '/getting-started/',
  '02-api': '/api/',
  '03-recipes': '/recipes/',
  '04-realism': '/guides/realism/',
  '05-troubleshooting': '/troubleshooting/',
  '06-implementation': '/guides/',
  '07-internals': '/internals/',
  '08-apiv2': '/history/v2/',
  '09-apiv3': '/history/v3/',
  '10-apiv4': '/history/v4/',
  '11-reference': '/api/texture-catalog/',
  '12-apiv5': '/history/v5/'
}

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
    // サブディレクトリ内からの相対リンク (../api/hooks.md 等) にも対応
    const base = file === 'README.md'
      ? ''
      : file.replace(/\.md$/, '').replace(/^\.\.\//, '').replace(/^\.\//, '')
    const slug = base === 'index' ? '' : `${base}/`
    return `](${prefix}/${slug}${anchor})`
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
  let prevBlank = false
  const out = []
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      prevBlank = false
      out.push(line)
      continue
    }
    if (!inFence && NAV_LINE.test(line)) continue
    if (!inFence) {
      if (line === '') {
        if (prevBlank) continue
        prevBlank = true
        out.push(line)
        continue
      }
      prevBlank = false
      out.push(escapeLine(line))
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

function withFrontmatter(text, title, extra = {}) {
  const extras = Object.entries(extra)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return `---\ntitle: ${yamlQuote(title)}${extras ? '\n' + extras : ''}\n---\n\n${text}`
}

// 言語ディレクトリ配下を再帰ウォークし、md ファイルの相対パス一覧を返す
function walk(dir, base = '') {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...walk(path.join(dir, entry.name), `${base}${entry.name}/`))
    } else if (/\.(md|mdx)$/.test(entry.name) && !EXCLUDED.has(entry.name)) {
      out.push(`${base}${entry.name}`)
    }
  }
  return out
}

// ディレクトリ直下の _meta.json (リポジトリ側管理) を解釈する:
// 存在すればそのまま content 側へ渡す (順序・タイトルの権威はリポジトリ側)。
// 無ければ収集したページから従来形式 (タイトル文字列) を自動生成する。
function buildMeta(srcDir, pages) {
  const metaPath = path.join(srcDir, '_meta.json')
  if (fs.existsSync(metaPath)) {
    return fs.readFileSync(metaPath, 'utf8')
  }
  const meta = {}
  for (const { base, title, isIndex } of pages) {
    meta[base] =
      isIndex
        ? { title, theme: { toc: false, typesetting: 'article' } }
        : title
  }
  return JSON.stringify(meta, null, 2) + '\n'
}

fs.rmSync(contentRoot, { recursive: true, force: true })
fs.mkdirSync(contentRoot, { recursive: true })

let files = 0
for (const { code } of LOCALES) {
  const srcDir = path.join(repoRoot, code)
  const outDir = path.join(contentRoot, code)
  if (!fs.existsSync(srcDir)) continue
  fs.mkdirSync(outDir, { recursive: true })

  // ---- md ページの変換 (直下 + サブディレクトリ再帰) ----
  const relFiles = walk(srcDir)
  // ディレクトリごとにグループ化
  const byDir = new Map()
  for (const rel of relFiles) {
    const dir = path.dirname(rel)
    if (!byDir.has(dir)) byDir.set(dir, [])
    byDir.get(dir).push(rel)
  }
  for (const [dir, rels] of byDir) {
    const pages = rels.map(rel => {
      const file = path.basename(rel)
      const src = fs.readFileSync(path.join(srcDir, rel), 'utf8')
      const title = titleOf(src, file)
      // README.md はそのディレクトリの index ページになる
      const base = file === 'README.md' ? 'index' : file.replace(/\.[^.]+$/, '')
      const outName = file === 'README.md' ? 'index.md' : file
      const isIndex = base === 'index'
      const outSub = path.join(outDir, dir)
      fs.mkdirSync(outSub, { recursive: true })
      const text = withFrontmatter(rewriteLinks(transform(src), code), title)
      fs.writeFileSync(path.join(outSub, outName), text)
      files++
      return { base, title, isIndex }
    })
    const metaContent = buildMeta(path.join(srcDir, dir), pages)
    fs.mkdirSync(path.join(outDir, dir), { recursive: true })
    fs.writeFileSync(path.join(outDir, dir, '_meta.json'), metaContent)
  }

  // ---- 旧 11 部 slug のリダイレクト案内ページ ----
  // 旧 URL /<lang>/01-making/ 等に来た訪問者を新配置へ導く。
  // Nextra の frontmatter redirect が効けば即時遷移、効かなくても本文リンクで案内される。
  for (const [slug, target] of Object.entries(REDIRECTS)) {
    const outPath = path.join(outDir, `${slug}.md`)
    if (fs.existsSync(outPath)) continue // 新構造で同名ページがある場合は上書きしない
    const text = withFrontmatter(
      `このページは移動しました。新しい場所: [${target}](${target})\n`,
      `移動しました — ${slug}`,
      { redirect: `${target}` }
    )
    fs.writeFileSync(outPath, text)
    files++
  }
}
console.log(`sync: wrote ${files} pages for ${LOCALES.length} locales -> ${contentRoot}`)
