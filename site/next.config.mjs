import nextra from 'nextra'
import { LOCALES } from './lib/langs.mjs'
import { basePath } from './lib/paths.mjs'

// バッチビルド (scripts/build-batched.mjs) では BUILD_LANGS で対象言語を絞る。
// Nextra は i18n.locales の全言語の content を pageMap 構築時に走査するため、
// 存在しない content/<lang> に対して ENOENT になるのを防ぐ。
const buildLangs = process.env.BUILD_LANGS ? process.env.BUILD_LANGS.split(',') : null
const activeLocales = buildLangs
  ? LOCALES.filter(l => buildLangs.includes(l.code))
  : LOCALES

const withNextra = nextra({
  defaultShowCopyCode: true,
  // ミドルウェア非使用 (/[lang]/ 直ルート) のため
  // ページマップのリンクに locale 接頭辞 (/ja/ など) を付ける
  unstable_shouldAddLocaleToLinks: true
})

export default withNextra({
  // Next.js には剥がされる。Nextra 自身が locales 列挙 + locale 接頭辞の判別に使う
  i18n: { locales: activeLocales.map((l) => l.code), defaultLocale: 'en' },
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // 960 ページ超の静的生成でビルドが OOM しないようメモリ最適化を優先
  experimental: { serverMinification: true, webpackMemoryOptimizations: true, cpus: 1 },
  webpack(config) {
    if (process.env.NO_BUILD_CACHE) config.cache = false
    return config
  }
})
