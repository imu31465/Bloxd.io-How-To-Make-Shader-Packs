import { Layout, LocaleSwitch, Navbar, ThemeSwitch } from 'nextra-theme-docs'
import { Search } from 'nextra/components'
import { GitHubIcon } from 'nextra/icons'
import { getPageMap } from 'nextra/page-map'
import { LOCALES } from '../../lib/langs.mjs'
import { repoUrl } from '../../lib/paths.mjs'
import { UI_I18N } from '../../lib/ui-i18n.mjs'
import { UiTranslator } from '../../components/ui-translator.jsx'

// 検索 UI の言語別テキスト (テーマ既定値は英語固定のため上書きする)
const SEARCH_I18N = {
  de: {
    placeholder: 'Dokumentation durchsuchen…',
    empty: 'Keine Ergebnisse gefunden.',
    error: 'Suchindex konnte nicht geladen werden.',
    loading: 'Lädt…'
  },
  en: {
    placeholder: 'Search documentation…',
    empty: 'No results found.',
    error: 'Failed to load search index.',
    loading: 'Loading…'
  },
  es: {
    placeholder: 'Buscar en la documentación…',
    empty: 'No se encontraron resultados.',
    error: 'No se pudo cargar el índice de búsqueda.',
    loading: 'Cargando…'
  },
  fr: {
    placeholder: 'Rechercher dans la documentation…',
    empty: 'Aucun résultat trouvé.',
    error: 'Échec du chargement de l’index de recherche.',
    loading: 'Chargement…'
  },
  hi: {
    placeholder: 'दस्तावेज़ खोजें…',
    empty: 'कोई परिणाम नहीं मिला।',
    error: 'खोज अनुक्रमणिका लोड नहीं हो सकी।',
    loading: 'लोड हो रहा है…'
  },
  ja: {
    placeholder: 'ドキュメントを検索…',
    empty: '結果が見つかりませんでした。',
    error: '検索インデックスを読み込めませんでした。',
    loading: '読み込み中…'
  },
  ko: {
    placeholder: '문서 검색…',
    empty: '검색 결과가 없습니다.',
    error: '검색 인덱스를 불러오지 못했습니다.',
    loading: '불러오는 중…'
  },
  pt: {
    placeholder: 'Pesquisar na documentação…',
    empty: 'Nenhum resultado encontrado.',
    error: 'Falha ao carregar o índice de pesquisa.',
    loading: 'Carregando…'
  },
  ru: {
    placeholder: 'Поиск по документации…',
    empty: 'Ничего не найдено.',
    error: 'Не удалось загрузить поисковый индекс.',
    loading: 'Загрузка…'
  },
  'zh-CN': {
    placeholder: '搜索文档…',
    empty: '未找到结果。',
    error: '无法加载搜索索引。',
    loading: '加载中…'
  }
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params
  // getPageMap はルート形の pageMap ([index, {ja: children…}, …]) を返すので、
  // 自分の言語の children を unwrap して sidebar に渡す
  // getPageMap(`/${lang}`) は言語スコープの pageMap を返すが、アンラップの
  // 有無は Nextra の内部実装 (_meta 収集の有無で pageMap[0] がフォルダに
  // なるかが変わる) に依存するため、両方の形態に対応する:
  //   - ルート形: [index, { name: lang, children: [...] }, ...]
  //   - スコープ形: 言語の children が直接並ぶ配列
  const rawMap = await getPageMap(`/${lang}`)
  const baseMap = rawMap.some(item => item.name === lang)
    ? rawMap.find(item => item.name === lang).children
    : rawMap
  const u = UI_I18N[lang] ?? UI_I18N.en
  // Shader Studio (/tools/shader-studio) は MDX ではなく app router の page.jsx で
  // 提供するため、pageMap に手動で登録する (Nextra 4 は MDX 内 import と JSX を
  // 無効化するため MDX 経由では 'use client' コンポーネントを配置できない)。
  //
  // 【重要】getPageMap() は Nextra がモジュールレベルでキャッシュしている配列を
  // 毎回同じ参照で返す。そのためここで破壊的に push するとレンダーのたびに同じ
  // キャッシュ配列へ tools エントリが積み重なり、サイドバーにフォルダが大量に
  // 並ぶ事故になる (各言語 80 個超の重複が発生した実績あり)。キャッシュ配列は
  // 一切変更せず、必ず新しい配列を合成して <Layout> に渡すこと。
  // また重複検査はフォルダ自身の route (/lang/tools) でも子の route でも
  // 一致するように見ること (従来は子の route だけをトップレベルで探していたため
  // 永遠に false になりガードが機能していなかった)。
  const hasStudio = baseMap.some(
    item =>
      item.route === `/${lang}/tools` ||
      (item.children ?? []).some(
        child => child.route === `/${lang}/tools/shader-studio`
      )
  )
  const pageMap = hasStudio
    ? baseMap
    : [
        ...baseMap,
        {
          name: 'tools',
          route: `/${lang}/tools`,
          title: u.toolsSection,
          children: [
            {
              name: 'shader-studio',
              route: `/${lang}/tools/shader-studio`,
              title: 'Shader Studio'
            }
          ]
        }
      ]
  const t = SEARCH_I18N[lang] ?? SEARCH_I18N.en
  // Nextra テーマの UI 文言 (英語ハードコード) を言語別に上書きする
  return (
    <Layout
      pageMap={pageMap}
      i18n={LOCALES.map(({ code, native }) => ({ locale: code, name: native }))}
      docsRepositoryBase={repoUrl}
      editLink={null}
      sidebar={{ defaultMenuCollapseLevel: 1, autoCollapse: true }}
      toc={{ title: u.tocTitle, backToTop: u.backToTop }}
      feedback={{ content: u.feedbackContent }}
      themeSwitch={{ dark: u.themeDark, light: u.themeLight, system: u.themeSystem }}
      // テーマ内蔵 CopyPage は英語ハードコードのため無効化し、
      // mdx-components.jsx の wrapper 上書きで多言語版に差し替える
      copyPageButton={false}
      search={
        <Search
          placeholder={t.placeholder}
          emptyResult={t.empty}
          errorText={t.error}
          loading={t.loading}
        />
      }
      navbar={
        <Navbar
          logo={<b>Bloxd Shader Packs</b>}
          projectLink={repoUrl}
          projectIcon={
            <GitHubIcon height="24" aria-label={u.projectRepository} />
          }
        >
          <LocaleSwitch lite />
          <ThemeSwitch />
        </Navbar>
      }
      footer={null}
    >
      <UiTranslator lang={lang} />
      {children}
    </Layout>
  )
}
