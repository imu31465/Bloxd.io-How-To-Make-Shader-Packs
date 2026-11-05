'use client'

// Nextra テーマ内蔵の CopyPage (英語ハードコード) の代替実装。
// mdx-components.jsx の wrapper 上書き経由で、テーマ本体の CopyPage を
// 無効化した上で挿入される (layout.jsx 側で copyPageButton={false})。
//
// 機能はテーマ版と同一: 「ページをコピー」ボタン + ChatGPT/Claude への
// 送信ドロップダウン。文言のみ UI_I18N の言語別辞書から供給する。

import { usePathname } from 'next/navigation'
import { useCopy } from 'nextra/hooks'
import { Button, Select } from 'nextra/components'
import {
  ArrowRightIcon,
  ChatGPTIcon,
  ClaudeIcon,
  CopyIcon,
  LinkArrowIcon
} from 'nextra/icons'
import { UI_I18N } from '../lib/ui-i18n.mjs'

function Item({ icon: Icon, title, description, isExternal }) {
  return (
    <div className="x:flex x:gap-3 x:items-center">
      <Icon width="16" />
      <div className="x:flex x:flex-col">
        <span className="x:font-medium x:flex x:gap-1">
          {title}
          {isExternal && <LinkArrowIcon height="1em" />}
        </span>
        <span className="x:text-xs">{description}</span>
      </div>
    </div>
  )
}

export function CopyPageLocalized({ sourceCode }) {
  const pathname = usePathname()
  // usePathname は basePath を含まない (/ja/api/hooks 形式)
  const locale = pathname.split('/')[1] || 'en'
  const t = UI_I18N[locale] ?? UI_I18N.en
  const { copy, isCopied } = useCopy()

  const handleCopy = () => copy(sourceCode)

  return (
    <div className="x:border x:inline-flex x:rounded-md x:items-stretch nextra-border x:float-end x:overflow-hidden">
      <Button
        className={({ hover }) =>
          'x:ps-2 x:pe-1 x:flex x:gap-2 x:text-sm x:font-medium x:items-center' +
          (isCopied ? ' x:opacity-70' : '') +
          (hover
            ? ' x:bg-gray-200 x:text-gray-900 x:dark:bg-primary-100/5 x:dark:text-gray-50'
            : '')
        }
        onClick={handleCopy}
      >
        <CopyIcon width="16" />
        {isCopied ? t.copied : t.copyPage}
      </Button>
      <Select
        anchor={{ to: 'bottom end', gap: 10 }}
        className="x:rounded-none"
        options={[
          {
            id: 'copy',
            name: (
              <Item
                icon={CopyIcon}
                title={t.copyPage}
                description={t.copyPageDesc}
              />
            )
          },
          {
            id: 'chatgpt',
            name: (
              <Item
                icon={ChatGPTIcon}
                title={t.openInChatGPT}
                description={t.askQuestions}
                isExternal
              />
            )
          },
          {
            id: 'claude',
            name: (
              <Item
                icon={ClaudeIcon}
                title={t.openInClaude}
                description={t.askQuestions}
                isExternal
              />
            )
          }
        ]}
        value=""
        selectedOption={<ArrowRightIcon width="12" className="x:rotate-90" />}
        onChange={value => {
          if (value === 'copy') {
            handleCopy()
            return
          }
          const url =
            value === 'chatgpt'
              ? 'chatgpt.com/?hints=search&prompt'
              : 'claude.ai/new?q'
          const query = `Read from ${location.href} so I can ask questions about it.`
          window.open(`https://${url}=${encodeURIComponent(query)}`, '_blank')
        }}
      />
    </div>
  )
}
