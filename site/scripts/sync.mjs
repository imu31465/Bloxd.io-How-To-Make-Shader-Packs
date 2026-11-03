#!/usr/bin/env node
// md ソース (リポジトリ言語ディレクトリ) -> Nextra content (<lang>/...) への変換。
//
// 2026-11 再構築: 7 分類ディレクトリ構造 (getting-started / api / guides /
// recipes / troubleshooting / internals / history) に対応。
//   - 言語ディレクトリ直下に加えサブディレクトリを再帰処理する
//   - 各ディレクトリの _meta.json (リポジトリ側で管理) を Nextra 4 が読める
//     形式 (ESM の _meta.js) に変換して content 側へ書き出す
//     (Nextra は _meta.json を収集しないため。順序・タイトルの権威はリポジトリ側)
//   - .md リンクに加えディレクトリへの相対リンク (../history/ 等) も
//     言語ルートからの絶対パスへ置き換える (trailingSlash 構成で
//     相対リンクが一段深く解決されるのを防ぐ)
//   - 旧 11 部構成 slug (01-making 等) へのリダイレクト案内ページは廃止
//     (旧 URL は 404 扱い。サイトは現行 7 分類の URL だけを公開する)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES } from '../lib/langs.mjs'

// BUILD_LANGS 環境変数 (カンマ区切り) があればその言語だけを対象にする
// (バッチビルド用 — メモリ制約下で next build を言語分割する)
const TARGET_LOCALES = process.env.BUILD_LANGS
  ? LOCALES.filter(l => process.env.BUILD_LANGS.split(',').includes(l.code))
  : LOCALES

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(siteRoot, '..')
const contentRoot = path.join(siteRoot, 'content')

const EXCLUDED = new Set(['00-full.md'])

// 部ファイル先頭・末尾のパンくず (md リンクだけの行: 「← 前の部」「マニュアルに戻る」「次の部 →」等) は
// テーマ内蔵の prev/next ページネーションが担うため、サイト掲載時は剥がす
const NAV_LINE = /^ *\[(?:[^[\]]*)\]\([^)#h/][^)]*\.md\)(?: *[·・] *\[(?:[^[\]]*)\]\([^)#h/][^)]*\.md\))* *$/

function titleOf(src, fallback) {
  const match = src.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : fallback
}

function yamlQuote(value) {
  return `'${value.replace(/'/g, "''")}'`
}

// 同ファイル間の相対リンクは、ページの深さ (index と各部で階層が違う) に左右されない
// 言語ルートからの絶対パスに置き換える (basePath は Next Link 側が付与するため含めない)
// relDir: この md ファイルの言語ルートからの相対ディレクトリ ('' / 'api/' など)
function rewriteLinks(src, code, relDir) {
  const prefix = `/${code}`
  // ページ相対パス -> 言語ルート相対パスに解決 ('../history/' in api/index.md -> 'history/')
  const resolveFromPage = target => {
    const joined = path.posix.normalize(
      path.posix.join(relDir ? relDir : '.', target)
    )
    return joined === '.' ? '' : joined
  }
  return src
    // 掲載対象外の全文一括版 (00-full.md) へのリンクは、リンクだけ剥がして文字は残す
    .replace(/\[([^\]]*)\]\(0?0-full\.md(?:#[^\s()]*|)\)/g, '$1')
    .replace(/\]\(([^()\s]+\.md)(#[^\s()]*)?\)/g, (full, file, anchor = '') => {
    if (/^(https?:)?\/\//i.test(file) || file.startsWith('/')) return full
    // サブディレクトリ内からの相対リンク (../api/hooks.md 等) にも対応
    const resolved = resolveFromPage(file)
    const base = resolved === 'README.md' ? '' : resolved.replace(/\.md$/, '')
    const slug = base === '' || base === 'index' ? '' : `${base}/`
    return `](${prefix}/${slug}${anchor})`
  })
    // ディレクトリへの相対リンク (../history/ / api/ / ../ など) も絶対パス化。
    // trailingSlash: true のサイト URL では相対リンクが一段深く解決されてしまうため。
    .replace(/\]\(([^()\s]*\/?\/)(#[^\s()]*)?\)/g, (full, dir, anchor = '') => {
    if (/^(https?:)?\/\//i.test(dir) || dir.startsWith('/')) return full
    const resolved = resolveFromPage(dir)
    const slug = resolved === '' ? '' : `${resolved.replace(/\/$/, '')}/`
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
// 順序・タイトルの権威はリポジトリ側。無ければ収集したページから
// 従来形式 (タイトル文字列) を自動生成する。
//
// Nextra 4 の pageMap 構築が収集するのは _meta.{js,jsx,ts,tsx} のみで、
// _meta.json は完全に無視される (サイドバーのカテゴリ名がディレクトリ名の
// フォールバック「API」「Getting Started」…のまま英語になるのはこのため)。
// そのため content 側には ESM モジュールの _meta.js として書き出す。
function buildMeta(srcDir, pages, label) {
  const metaPath = path.join(srcDir, '_meta.json')
  let meta
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  } else {
    meta = {}
    for (const { base, title, isIndex } of pages) {
      meta[base] =
        isIndex
          ? { title, theme: { toc: false, typesetting: 'article' } }
          : title
    }
  }
  // 検証: メタの各キーは実在するページ/サブディレクトリを指す必要がある
  // (Nextra の normalizePageMap は不明なキーでビルドを落とすため、
  // ここで先に分かりやすいエラーを出す)
  const existing = new Set(pages.map(p => p.base))
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) existing.add(entry.name)
  }
  for (const [key, value] of Object.entries(meta)) {
    if (key === '*') continue
    const isStructural =
      typeof value === 'object' &&
      value !== null &&
      (('type' in value && (value.type === 'separator' || value.type === 'menu')) ||
        'href' in value)
    if (!isStructural && !existing.has(key)) {
      throw new Error(
        `[sync] ${label}_meta.json: key "${key}" does not match any page or subdirectory`
      )
    }
  }
  return `export default ${JSON.stringify(meta, null, 2)}\n`
}

fs.rmSync(contentRoot, { recursive: true, force: true })
fs.mkdirSync(contentRoot, { recursive: true })

let files = 0
for (const { code } of TARGET_LOCALES) {
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
      const relDir = dir === '.' ? '' : `${dir.replace(/\/$/, '')}/`
      const text = withFrontmatter(rewriteLinks(transform(src), code, relDir), title)
      fs.writeFileSync(path.join(outSub, outName), text)
      files++
      return { base, title, isIndex }
    })
    const metaContent = buildMeta(
      path.join(srcDir, dir),
      pages,
      `${code}/${dir === '.' ? '' : dir.replace(/\/$/, '') + '/'}`
    )
    fs.mkdirSync(path.join(outDir, dir), { recursive: true })
    fs.writeFileSync(path.join(outDir, dir, '_meta.js'), metaContent)
  }
}

console.log(`sync: wrote ${files} pages for ${TARGET_LOCALES.length} locales -> ${contentRoot}`)
