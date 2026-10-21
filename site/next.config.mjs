import nextra from 'nextra'
import { LOCALES } from './lib/langs.mjs'
import { basePath } from './lib/paths.mjs'

const withNextra = nextra({
  defaultShowCopyCode: true,
  // ミドルウェア非使用 (/[lang]/ 直ルート) のため
  // ページマップのリンクに locale 接頭辞 (/ja/ など) を付ける
  unstable_shouldAddLocaleToLinks: true
})

export default withNextra({
  // Next.js には剥がされる。Nextra 自身が locales 列挙 + locale 接頭辞の判別に使う
  i18n: { locales: LOCALES.map((l) => l.code), defaultLocale: 'en' },
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: { serverMinification: false },
  webpack(config) {
    if (process.env.NO_BUILD_CACHE) config.cache = false
    return config
  }
})
