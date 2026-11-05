import { LOCALES } from '../../../../lib/langs.mjs'
import { STUDIO_I18N } from '../../../../lib/studio-i18n.mjs'
import ShaderStudioApp from '../../../../components/shader-studio/app.jsx'

// バッチビルド (BUILD_LANGS) では対象言語のみ生成 (MDX ページと同じ方針)
const ACTIVE = process.env.BUILD_LANGS
  ? LOCALES.filter(l => process.env.BUILD_LANGS.split(',').includes(l.code))
  : LOCALES

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
  return <ShaderStudioApp lang={lang} />
}
