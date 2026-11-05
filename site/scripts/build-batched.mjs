#!/usr/bin/env node
// バッチビルド: 全 10 言語を BUILD_LANGS で分割して next build を複数回実行し、
// 出力をマージして単一の out/ を作る。960 ページ超の静的生成が 1 回のビルドで
// OOM する環境 (4GB コンテナ / CI ランナー) でも完走するための仕組み。
//
// 使い方: LANG_BATCH_SIZE=2 npm run build   (既定: 1 バッチ 2 言語 = 5 バッチ)
//
// 仕組み:
//   1. 各バッチ: BUILD_LANGS=<langs> npm run sync → next build → out を退避 → .next を削除
//   2. 退避した各 out の言語ディレクトリを 1 つの out/ へ移動
//   3. _next/ (共通の静的アセット、ハッシュ付きファイル名) は全バッチ分をマージ
//      (バッチ間でハッシュが変わっても、全 HTML の参照は自分のバッチの _next を
//       持ち続けるため、全部残せば解決する)
//   4. flatten-rsc → fix-html-lang → pagefind を最後にまとめて実行
//      (pagefind の --site を .next/server/app から out へ変更し、全言語を索引)
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES } from '../lib/langs.mjs'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(siteRoot)

const all = LOCALES.map(l => l.code)
const BATCH_SIZE = Number(process.env.LANG_BATCH_SIZE || 2)
const batches = []
for (let i = 0; i < all.length; i += BATCH_SIZE) {
  batches.push(all.slice(i, i + BATCH_SIZE))
}
console.log(`batched build: ${all.length} locales in ${batches.length} batches (size ${BATCH_SIZE})`)

fs.rmSync('out', { recursive: true, force: true })
fs.rmSync('.next', { recursive: true, force: true })
for (const d of fs.readdirSync('.').filter(n => /^out-part-\d+$/.test(n))) {
  fs.rmSync(d, { recursive: true, force: true })
}

const NODE_OPTS = process.env.NODE_OPTIONS || '--max-old-space-size=3000'

const stashes = []
for (let b = 0; b < batches.length; b++) {
  const langs = batches[b]
  console.log(`\n=== batch ${b + 1}/${batches.length}: ${langs.join(', ')} ===`)
  execSync(`npm run sync`, {
    stdio: 'inherit',
    env: { ...process.env, BUILD_LANGS: langs.join(',') }
  })
  execSync(`npx next build --webpack`, {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS, BUILD_LANGS: langs.join(',') }
  })
  const stash = `out-part-${b}`
  fs.renameSync('out', stash)
  stashes.push(stash)
  fs.rmSync('.next', { recursive: true, force: true })
}

// ---- マージ ----
console.log('\n=== merging batches ===')
fs.mkdirSync('out', { recursive: true })
const movedRoots = new Set()
for (const stash of stashes) {
  for (const entry of fs.readdirSync(stash)) {
    if (entry === '_next') continue
    if (movedRoots.has(entry) && entry !== 'index.html') {
      // 言語ディレクトリはバッチ間で排他のはずだが、万一共通ファイルが
      // 衝突したら最初のバッチのものを優先する (index.html / 404 は共通)
      continue
    }
    fs.renameSync(path.join(stash, entry), path.join('out', entry))
    movedRoots.add(entry)
  }
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory()) copyDir(path.join(src, entry.name), path.join(dst, entry.name))
    else {
      const target = path.join(dst, entry.name)
      if (!fs.existsSync(target)) fs.copyFileSync(path.join(src, entry.name), target)
    }
  }
}
for (const stash of stashes) {
  const nd = path.join(stash, '_next')
  if (fs.existsSync(nd)) copyDir(nd, path.join('out', '_next'))
}
for (const stash of stashes) fs.rmSync(stash, { recursive: true, force: true })

// ---- 後処理 (旧 postbuild を再現、pagefind は out 全体を索引) ----
console.log('\n=== post-processing ===')
execSync(`node scripts/flatten-rsc.mjs out`, { stdio: 'inherit' })
execSync(`node scripts/fix-html-lang.mjs out`, { stdio: 'inherit' })
execSync(`npx pagefind --site out --output-path out/_pagefind`, { stdio: 'inherit' })
// pagefind の索引対象にならないよう、索引後に言語別 404 を生成する
execSync(`node scripts/localize-404.mjs out`, { stdio: 'inherit' })
console.log('\nbatched build complete -> out/')
