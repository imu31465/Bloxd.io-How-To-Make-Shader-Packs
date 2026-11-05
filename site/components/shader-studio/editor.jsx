'use client'

// CodeMirror 6 WGSL エディタ。C++ 近似のハイライト + WGSL 固有キーワード。
import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { StreamLanguage, LanguageSupport } from '@codemirror/language'
import { cpp } from '@codemirror/lang-cpp'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

// WGSL 風 StreamLanguage: bloxd* 予約名とディレクティブを追加ハイライト
const wgslHighlight = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null
    // プリプロセッサディレクティブ
    if (stream.sol() && stream.match(/^#\s*\w+/)) return 'meta keyword'
    // コメント
    if (stream.match('//')) { stream.skipToEnd(); return 'comment' }
    if (stream.match('/*')) {
      while (!stream.eol()) { if (stream.match('*/')) break; stream.next() }
      return 'comment'
    }
    // bloxd* 識別子 (API)
    if (stream.match(/^bloxd[A-Za-z0-9_]*/)) return 'variableName.standard keyword'
    // BLOXD_* マクロ
    if (stream.match(/^BLOXD_[A-Z_]+/)) return 'meta strong'
    // 数値
    if (stream.match(/^(0x[0-9a-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?[fhiu]?)/)) return 'number'
    // 文字列
    if (stream.match(/^"(\\.|[^"\\])*"/)) return 'string'
    // キーワード
    if (stream.match(/^(fn|var|let|const|struct|alias|return|if|else|loop|while|for|break|continue|discard|enable|requires|true|false|override|switch|case|default|fallthrough|bitcast|type)\b/)) return 'keyword'
    // 型
    if (stream.match(/^(vec[234][fihu]|mat[234]x[234][fh]|i32|u32|f32|f16|bool|i8|u8|i16|u16|i64|u64|array|atomic|ptr|texture_2d_array|texture_depth_2d|sampler|storage|uniform|private|workgroup)\b/)) return 'typeName'
    // 組み込み関数
    if (stream.match(/^(dot|cross|normalize|length|distance|min|max|clamp|mix|select|saturate|abs|ceil|floor|round|trunc|fract|sin|cos|tan|asin|acos|atan|atan2|pow|exp|exp2|log|log2|sqrt|inverseSqrt|sign|fma|step|smoothstep|textureSampleLevel|textureSample|textureLoad|textureDimensions|textureNumLevels|dpdx|dpdy|fwidth|pack4x8unorm|unpack4x8unorm|pack2x16float|unpack2x16float|all|any|select)\b/)) return 'keyword standard'
    // 識別子
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) return 'variableName'
    // 演算子
    if (stream.match(/^[+\-*/%=<>!&|^~?:.,;(){}\[\]]+/)) return 'operator punctuation'
    stream.next()
    return null
  }
})

const wgsl = new LanguageSupport(wgslHighlight)

export function WgslEditor({ value, onChange, height = '260px' }) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          keymap.of([...defaultKeymap, indentWithTab]),
          wgsl,
          syntaxHighlighting(defaultHighlightStyle),
          EditorView.updateListener.of(v => {
            if (v.docChanged) onChangeRef.current?.(v.state.doc.toString())
          }),
          EditorView.theme({
            '&': { fontSize: '12px', backgroundColor: 'var(--nextra-bg, #fff)' },
            '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', maxHeight: height },
            '.cm-gutters': { backgroundColor: 'transparent' }
          })
        ]
      }),
      parent: hostRef.current
    })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
    // 初期値はマウント時のみ (外部 reset は key 変更で対応)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={hostRef} className="nextra-border x:border x:rounded-md x:overflow-hidden" />
}

export default WgslEditor
