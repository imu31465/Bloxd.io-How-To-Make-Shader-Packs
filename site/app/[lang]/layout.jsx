import { Layout, LocaleSwitch, Navbar, ThemeSwitch } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import { LOCALES } from '../../lib/langs.mjs'
import { repoUrl } from '../../lib/paths.mjs'

export default async function LangLayout({ children, params }) {
  const { lang } = await params
  // getPageMap はルート形の pageMap ([index, {ja: children…}, …]) を返すので、
  // 自分の言語の children を unwrap して sidebar に渡す
  const pageMap = (await getPageMap(`/${lang}`)).find(item => item.name === lang)?.children ?? []
  return (
    <Layout
      pageMap={pageMap}
      i18n={LOCALES.map(({ code, native }) => ({ locale: code, name: native }))}
      docsRepositoryBase={repoUrl}
      editLink={null}
      sidebar={{ defaultMenuCollapseLevel: 1, autoCollapse: true }}
      navbar={
        <Navbar
          logo={<b>Bloxd Shader Packs</b>}
          projectLink={repoUrl}
        >
          <LocaleSwitch lite />
          <ThemeSwitch />
        </Navbar>
      }
      footer={null}
    >
      {children}
    </Layout>
  )
}
