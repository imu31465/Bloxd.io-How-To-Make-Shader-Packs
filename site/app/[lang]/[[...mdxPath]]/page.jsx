import fs from 'node:fs'
import path from 'node:path'
import { importPage } from 'nextra/pages'
import { LOCALES } from '../../../lib/langs.mjs'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'

// バッチビルドでは BUILD_LANGS で走査対象を絞る (content/<lang> が無い言語で
// readdirSync が ENOENT を投げるのを防ぐ)
const ACTIVE_LOCALES = process.env.BUILD_LANGS
  ? LOCALES.filter(l => process.env.BUILD_LANGS.split(',').includes(l.code))
  : LOCALES

export function generateStaticParams() {
  const contentRoot = path.join(process.cwd(), 'content')
  const files = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name))
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        files.push(path.join(dir, entry.name))
      }
    }
  }
  for (const { code } of ACTIVE_LOCALES) {
    walk(path.join(contentRoot, code))
  }
  return files.map(file => {
    const rel = path.relative(contentRoot, file).split(/[\\/]/)
    const lang = rel[0]
    const base = rel.slice(1).join('/').replace(/\.(md|mdx)$/, '')
    // README -> index 変換でできる各階層の index ページは、Nextra の慣習に従い
    // パスから 'index' を除去してディレクトリ自身の URL にする
    // (ja/getting-started/index -> /ja/getting-started/)
    const parts = base.split('/')
    if (parts[parts.length - 1] === 'index') parts.pop()
    const mdxPath = parts.length === 0 || parts[0] === '' ? [] : parts
    return { lang, mdxPath }
  })
}

export async function generateMetadata(props) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath, params.lang)
  if (!metadata.title) {
    return { ...metadata, title: metadata.title ?? undefined }
  }
  return metadata
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props) {
  const params = await props.params
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(
    params.mdxPath,
    params.lang
  )
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
