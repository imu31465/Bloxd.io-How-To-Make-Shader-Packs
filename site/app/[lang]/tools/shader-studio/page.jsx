import { useMDXComponents } from 'nextra-theme-docs'
import { LOCALES } from '../../../../lib/langs.mjs'
import { STUDIO_I18N } from '../../../../lib/studio-i18n.mjs'
import ShaderStudioApp from '../../../../components/shader-studio/app.jsx'

// バッチビルド (BUILD_LANGS) では対象言語のみ生成 (MDX ページと同じ方針)
const ACTIVE = process.env.BUILD_LANGS
  ? LOCALES.filter(l => process.env.BUILD_LANGS.split(',').includes(l.code))
  : LOCALES

// Shader Studio は 'use client' コンポーネントのため MDX ページにできず
// app router の page.jsx で提供している (Nextra 4 は MDX 内 import と JSX を
// 無効化するため MDX 経由では配置できない)。
// MDX ページは Nextra の mdx-components (wrapper) を自動的に通るため
// サイドバー・パンくず・ページネーション付きの docs レイアウトになるが、
// page.jsx はそれを素通りしツールが孤立ページになってしまっていた
// (ドキュメントへ戻る導線がない)。ここでは同じ wrapper を明示的に適用して
// ドキュメントのページの一部として描画する。
// layout.jsx 側で pageMap に frontMatter { layout: 'full', toc: false } を
// 与えているため、右 TOC 欄なしでコンテンツ幅をフルに使える。
const { wrapper: DocsWrapper } = useMDXComponents()

export function generateStaticParams() {
  return ACTIVE.map(({ code: lang }) => ({ lang }))
}

export async function generateMetadata({ params }) {
  const { lang } = await params
  const t = STUDIO_I18N[lang] ?? STUDIO_I18N.en
  return {
    title: `${t.title} — Bloxd.io Shader Packs`,
    description: t.tagline
  }
}

export default async function ShaderStudioPage({ params }) {
  const { lang } = await params
  const t = STUDIO_I18N[lang] ?? STUDIO_I18N.en
  return (
    <DocsWrapper toc={[]} metadata={{ searchable: false, title: t.title }}>
      <ShaderStudioApp lang={lang} />
    </DocsWrapper>
  )
}
