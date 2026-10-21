import { Footer, Layout, LocaleSwitch, Navbar } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import { LOCALES } from '../../lib/langs.mjs'
import { repoUrl } from '../../lib/paths.mjs'

export default async function LangLayout({ children, params }) {
  const { lang } = await params
  const pageMap = await getPageMap(`/${lang}`)
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
        </Navbar>
      }
      footer={
        <Footer>
          <a href={repoUrl}>GitHub</a>
        </Footer>
      }
    >
      {children}
    </Layout>
  )
}
