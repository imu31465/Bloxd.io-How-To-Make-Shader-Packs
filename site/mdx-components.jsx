import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { CopyPageLocalized } from './components/copy-page-localized.jsx'

const docsComponents = getDocsMDXComponents()
// テーマ既定の wrapper (TOC・パンくず・ページネーション等を含む ClientWrapper
// のサーバ側ラッパ)。CopyPage だけはテーマ内蔵版が英語ハードコードのため、
// layout.jsx 側で copyPageButton={false} にして内蔵版を抑制した上で、
// ここで多言語版を先頭に差し込む。
const OriginalWrapper = docsComponents.wrapper

function LocalizedWrapper({ toc, children, metadata, bottomContent, sourceCode, ...props }) {
  return (
    <OriginalWrapper
      toc={toc}
      metadata={metadata}
      bottomContent={bottomContent}
      sourceCode={sourceCode}
      {...props}
    >
      {sourceCode ? <CopyPageLocalized sourceCode={sourceCode} /> : null}
      {children}
    </OriginalWrapper>
  )
}

export const useMDXComponents = (components = {}) => ({
  ...docsComponents,
  wrapper: LocalizedWrapper,
  ...components
})
