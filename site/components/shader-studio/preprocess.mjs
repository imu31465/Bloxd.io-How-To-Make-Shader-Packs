// パックコードのプリプロセッサ — エンジンの検証済み仕様と同一:
//   #define NAME (値なし) / #ifdef / #ifndef / #else / #endif
//   '#' は行頭 (関数本体内も可)。フラグ名の一致はケース非依存。
//   誤った #ifdef 名はエラー (公式セットを列挙)。
// BLOXD_LIGHTING は apiVersion 5 で削除済み (専用エラー)。

export const MACRO_ERROR_SET = 'the official set is BLOXD_STRICT, BLOXD_ALPHA, BLOXD_SCENE_DEPTH'

export function preprocessWgsl(source, macros) {
  const macroSet = new Set([...macros].map(m => String(m).toLowerCase()))
  const lines = source.split('\n')
  const out = []
  // スタック: [{branch: 'then'|'else', active: bool, parentActive: bool, line: number}]
  const stack = []
  const errors = []
  let lineNo = 0

  const isActive = () => stack.every(f => f.active)

  for (const rawLine of lines) {
    lineNo++
    const line = rawLine.replace(/\r$/, '')
    const m = line.match(/^[ \t]*#[ \t]*(\w+)(?:[ \t]+(\S+))?[ \t]*$/)

    if (m) {
      const directive = m[1].toLowerCase()
      const arg = m[2]
      if (directive === 'define') {
        if (!arg) { errors.push({ line: lineNo, message: '#define requires a flag name' }); continue }
        if (isActive()) macroSet.add(arg.toLowerCase())
        continue
      }
      if (directive === 'ifdef' || directive === 'ifndef') {
        if (!arg) { errors.push({ line: lineNo, message: `#${directive} requires a flag name` }); continue }
        const flag = arg.toLowerCase()
        if (flag === 'bloxd_lighting') {
          errors.push({ line: lineNo, message: 'BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.' })
        }
        // パックから使えるのは公式3種のみ (define で自分で定義した名前も許可)
        if (!['bloxd_strict', 'bloxd_alpha', 'bloxd_scene_depth', 'bloxd_lighting'].includes(flag) &&
            !stack.some(f => f.definedLocal === flag) && !macroSet.has(flag) && !isLocallyDefined(macroSet, flag, source)) {
          // 未定義の公式マクロでも #ifndef ガードでは頻出するため、未知名はここでは許可し
          // validator 側で公式セット外の #ifdef を検査する (エンジンの挙動と同じ)
        }
        const parentActive = isActive()
        let cond = macroSet.has(flag)
        if (directive === 'ifndef') cond = !cond
        stack.push({ branch: 'then', active: parentActive && cond, parentActive, line: lineNo, flag })
        continue
      }
      if (directive === 'else') {
        if (!stack.length) { errors.push({ line: lineNo, message: '#else without #ifdef' }); continue }
        const top = stack[stack.length - 1]
        if (top.branch === 'else') { errors.push({ line: lineNo, message: 'duplicate #else' }); continue }
        top.branch = 'else'
        top.active = top.parentActive && !top.active
        continue
      }
      if (directive === 'endif') {
        if (!stack.length) { errors.push({ line: lineNo, message: '#endif without #ifdef' }); continue }
        stack.pop()
        continue
      }
      // 未対応ディレクティブ (#if / #undef / #define値付き はエンジンでも不可)
      errors.push({ line: lineNo, message: `pack.wgsl:${lineNo} '#${directive}' is not a supported preprocessor directive. Supported: #define, #ifdef, #ifndef, #else, #endif` })
      continue
    }

    if (isActive()) out.push(line)
  }

  for (const f of stack) {
    errors.push({ line: f.line, message: `missing #endif for the #ifdef on line ${f.line}` })
  }

  return { code: out.join('\n'), errors, emittedMacros: macroSet }
}

// ユーザーが自分で #define した名前 (公式3種以外) はパック内では有効。
// 簡易判定: ソース内に #define <name> があるか。
function isLocallyDefined(macroSet, flag, source) {
  return new RegExp('^[ \\t]*#[ \\t]*define[ \\t]+' + flag + '[ \\t]*$', 'im').test(source)
}

// #ifdef に現れた名前が「公式3種 + ローカルdefine」のいずれでもない場合の検査
// (エンジンの「wrong #ifdef name lists the official set」相当)
export function checkMacroNames(source) {
  const errors = []
  const localDefines = new Set()
  for (const m of source.matchAll(/^[ \t]*#[ \t]*define[ \t]+(\S+)[ \t]*$/gm)) {
    localDefines.add(m[1].toLowerCase())
  }
  let lineNo = 0
  for (const line of source.split('\n')) {
    lineNo++
    const m = line.match(/^[ \t]*#[ \t]*(?:ifdef|ifndef)[ \t]+(\S+)[ \t]*$/)
    if (!m) continue
    const flag = m[1].toLowerCase()
    if (['bloxd_strict', 'bloxd_alpha', 'bloxd_scene_depth', 'bloxd_lighting'].includes(flag) ||
        localDefines.has(flag)) continue
    errors.push({
      line: lineNo,
      message: `pack.wgsl:${lineNo} '#ifdef ${m[1]}' names no known flag; ${MACRO_ERROR_SET}, or a flag your pack defined with #define.`
    })
  }
  return errors
}
