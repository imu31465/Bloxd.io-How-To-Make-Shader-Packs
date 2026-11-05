'use client'

// Nextra テーマが JS バンドル内に英語ハードコードで持つ UI 文言のうち、
// <Layout> props でも CopyPageLocalized でもカバーできない残り
// (title / aria-label 属性、および静的テキスト「Skip to Content」) を
// ハイドレーション完了後の DOM に対して翻訳する。
//
// 安全性の根拠:
//  - 属性値: React は本番ハイドレーションで属性値の差異を検証しない。
//    また再描画時も vdom 上で変化した属性のみ書き戻すため、翻訳済みの
//    title / aria-label はそのまま残る (書き戻された場合はオブザーバーが
//    再翻訳して収束する)。
//  - 静的テキスト: vdom 上で決して変化しない文字列のみを対象とするため
//    React が書き戻すことはない。
//  - コードブロック (CODE/PRE) 内のテキストは対象外。本文中の技術用語を
//    誤って翻訳しない。
//
// なお self.__next_f 上の RSC ペイロードにはこれらの文言は含まれない
// (クライアントコンポーネント内部のハードコードのため) ので、
// HTML とペイロードで不整合は発生しない。

import { useEffect } from 'react'
import { UI_I18N } from '../lib/ui-i18n.mjs'

// テキスト翻訳の対象外とする要素 (コード例に英語キーワードが出うるため)
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'TEXTAREA'
])

function createPatcher(dict) {
  const titleMap = {
    'Change language': dict.changeLanguage,
    'Change theme': dict.changeTheme,
    'Collapse sidebar': dict.collapseSidebar,
    'Expand sidebar': dict.expandSidebar,
    'Copy code': dict.copyCode,
    'Toggle word wrap': dict.toggleWordWrap
  }
  const ariaMap = {
    'table of contents': dict.tableOfContents,
    'Permalink for this section': dict.permalink,
    'Home page': dict.homePage,
    'Project repository': dict.projectRepository,
    Menu: dict.menu
  }
  const textMap = {
    'Skip to Content': dict.skipToContent
  }

  const patchText = node => {
    if (node.nodeType !== 3 /* TEXT */) return
    const parent = node.parentElement
    if (!parent || SKIP_TAGS.has(parent.tagName)) return
    const value = node.nodeValue
    if (value in textMap) node.nodeValue = textMap[value]
  }

  const patchElement = el => {
    const title = el.getAttribute('title')
    if (title !== null && title in titleMap) {
      el.setAttribute('title', titleMap[title])
    }
    const aria = el.getAttribute('aria-label')
    if (aria !== null && aria in ariaMap) {
      el.setAttribute('aria-label', ariaMap[aria])
    }
  }

  const patchSubtree = root => {
    if (root.nodeType === 1 /* ELEMENT */) patchElement(root)
    else if (root.nodeType === 3 /* TEXT */) {
      patchText(root)
      return
    } else return
    const walker = document.createTreeWalker(root, 5 /* ELEMENT | TEXT */)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (node.nodeType === 1) patchElement(node)
      else patchText(node)
    }
  }

  return { patchElement, patchText, patchSubtree }
}

export function UiTranslator({ lang }) {
  useEffect(() => {
    const dict = UI_I18N[lang]
    if (!dict || lang === 'en') return

    const { patchElement, patchText, patchSubtree } = createPatcher(dict)

    // 初回: ハイドレーション完了後の DOM 全体を対象
    patchSubtree(document.body)

    // 以降: クライアント側ナビゲーション・ドロップダウン展開・状態変化で
    // 追加/更新されるノードを継続的に翻訳
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') {
          patchElement(record.target)
        } else if (record.type === 'characterData') {
          patchText(record.target)
        } else {
          for (const node of record.addedNodes) {
            if (node.nodeType === 1) patchSubtree(node)
            else if (node.nodeType === 3) patchText(node)
          }
        }
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title', 'aria-label'],
      characterData: true
    })

    return () => observer.disconnect()
  }, [lang])

  return null
}
