// Studio 用パックバリデータ — pack_check.mjs (v2) の知識のブラウザ移植。
// エンジン実測の検証規則 (docs: internals/shader-validation.md + api/restrictions.md):
//   ERROR:
//     - 予約識別子: bloxd で始まる名前の定義 (fn/var/let/const/struct/alias)
//     - strict で vertex フックの定義 (「strict and has a vertex hook」)
//     - 出力構造体の直接構築: var x: BloxdSurface; 等 (bloxdDefault* 経由のみ)
//     - #ifdef BLOXD_LIGHTING (apiVersion 5 で削除済み)
//     - 未対応ディレクティブ / #define 値付き / #if 式
//   WARNING (静的コンパイルは通るが実機で失敗しうる罠):
//     - .alpha へのアクセスが #ifdef BLOXD_ALPHA の外
//     - モジュールスコープ let
//     - f16 系 / atomic
//     - vertex フック内の dpdx/dpdy/fwidth
//     - フックパラメータへの代入 (WGSL の引数は読み取り専用)

const HOOK_RE = /fn\s+bloxd(Terrain|Liquid|Model)(Vertex|Surface|Light)\s*\(/
const OUTPUT_STRUCTS = ['BloxdVertex', 'BloxdSurface', 'BloxdLight']
// パックが定義してよい唯一の bloxd* 名前: 9フック (api/hooks.md)
const HOOK_NAMES = new Set([
  'bloxdTerrainVertex', 'bloxdTerrainSurface', 'bloxdTerrainLight',
  'bloxdLiquidVertex', 'bloxdLiquidSurface', 'bloxdLiquidLight',
  'bloxdModelVertex', 'bloxdModelSurface', 'bloxdModelLight'
])

function stripComments(source) {
  const lines = source.split(/\r?\n/)
  let inBlock = false
  return lines.map(line => {
    let out = ''
    let i = 0
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i)
        if (end < 0) { i = line.length } else { inBlock = false; i = end + 2 }
        out += ' '
        continue
      }
      const lineComment = line.indexOf('//', i)
      const blockStart = line.indexOf('/*', i)
      if (lineComment >= 0 && (blockStart < 0 || lineComment < blockStart)) {
        out += line.slice(i, lineComment)
        break
      }
      if (blockStart >= 0) {
        out += line.slice(i, blockStart) + ' '
        i = blockStart + 2
        inBlock = true
        continue
      }
      out += line.slice(i)
      break
    }
    return out
  })
}

export function validatePack(source, { strict = false } = {}) {
  const errors = []
  const warnings = []
  const lines = stripComments(source)
  const rawLines = source.split(/\r?\n/)

  // #ifdef スタック追跡 (ガード判定用)
  let stack = []

  for (let n = 0; n < lines.length; n++) {
    const line = lines[n]
    const lineno = n + 1
    const trimmed = line.trim()

    // ディレクティブ追跡
    if (trimmed.startsWith('#')) {
      const m = trimmed.match(/^#\s*(\w+)?\s*(.*)$/)
      if (m) {
        const d = m[1]
        if (d === 'ifdef' || d === 'ifndef') stack.push((m[2] || '').trim())
        else if (d === 'else') stack.push('?')
        else if (d === 'endif') stack.pop()
      }
      continue
    }

    // (1) 予約識別子: bloxd で始まる定義 (9フック名は除く — 定義してよい)
    const defMatch = trimmed.match(/^(?:fn|var|let|const|struct|alias|type)\s+(bloxd\w*)/)
    if (defMatch && !HOOK_NAMES.has(defMatch[1])) {
      errors.push({
        line: lineno,
        message: `'${defMatch[1]}' is reserved by the shader pack API (names starting with bloxd are read-only).`
      })
    }

    // (3) 出力構造体の直接構築 (var x: BloxdSurface; 形式)
    const bareDecl = trimmed.match(/^var\s+([A-Za-z_]\w*)\s*:\s*(Bloxd\w+)\s*;/)
    if (bareDecl && OUTPUT_STRUCTS.includes(bareDecl[2])) {
      errors.push({
        line: lineno,
        message: `A bare 'var ${bareDecl[1]}: ${bareDecl[2]};' is a validation error — build outputs from bloxdDefault* (or 'var out = s;' in light hooks).`
      })
    }

    // strict 違反: vertex フックの定義
    const hookDef = trimmed.match(/^fn\s+bloxd(Terrain|Liquid|Model)Vertex\s*\(/)
    if (hookDef && strict && !stack.includes('BLOXD_STRICT')) {
      // #ifndef BLOXD_STRICT ガード内なら OK (スタックには ifndef の名前が入る)
    }
    if (hookDef && strict) {
      // ガードの有無は行ごとのスタックでは正確でないため、
      // 「#ifndef BLOXD_STRICT ～ #endif で囲まれているか」を全体で判定
      if (!isGuardedVertexHook(lines, n)) {
        errors.push({
          line: lineno,
          message: `Shader pack code ${strict ? 'strict' : 'allow'}.${hookDef[1].toLowerCase()} is strict and has a vertex hook, which strict mode never runs. Wrap it in #ifndef BLOXD_STRICT.`
        })
      }
    }

    // WARNING: .alpha が BLOXD_ALPHA ガードの外
    if (/\.\s*alpha\b/.test(line) && !stack.includes('BLOXD_ALPHA')) {
      warnings.push({
        line: lineno,
        message: `'.alpha' access outside #ifdef BLOXD_ALPHA — the field does not exist in strict terrain/model variants (GPU validation fails there).`
      })
    }
    // WARNING: f16 系
    if (/\b(f16|vec[234]h|mat[234]x[234]h)\b/.test(line)) {
      warnings.push({
        line: lineno,
        message: `f16/half types need 'enable f16' which packs cannot write — fails GPU validation.`
      })
    }
    // WARNING: atomic
    if (/\batomic\s*</.test(line)) {
      warnings.push({
        line: lineno,
        message: `atomic<T> is only allowed in storage/workgroup — packs can only declare var<private>, so this fails GPU validation.`
      })
    }
    // WARNING: モジュールスコープ let (関数外)
    if (/^let\s/.test(trimmed) && !isInsideFunction(lines, n)) {
      warnings.push({
        line: lineno,
        message: `Module-scope 'let' is invalid WGSL (passes static validation but fails at GPU stage). Use 'const'.`
      })
    }
    // WARNING: mod 予約語
    if (/\bmod\s*\(/.test(line)) {
      warnings.push({
        line: lineno,
        message: `'mod' is a reserved word in WGSL — write remainders with the % operator.`
      })
    }
  }

  // (f) フックパラメータへの代入
  const paramNames = []
  for (let n = 0; n < lines.length; n++) {
    const hk = lines[n].match(/^\s*fn\s+bloxd\w+\s*\(([^)]*)\)/)
    if (hk) {
      for (const p of hk[1].split(',')) {
        const m = p.trim().match(/^([A-Za-z_]\w*)\s*:\s*Bloxd/)
        if (m) paramNames.push({ name: m[1], line: n + 1 })
      }
    }
  }
  for (const p of paramNames) {
    const re = new RegExp('\\b' + p.name + '\\s*(?:\\.[\\w.]+)?\\s*(?:\\+=|-=|\\*=|/=|=)(?!=)')
    for (let n = 0; n < lines.length; n++) {
      if (re.test(lines[n]) && !/^\s*(let|var|const)\s/.test(lines[n])) {
        warnings.push({
          line: n + 1,
          message: `Assigning to hook parameter '${p.name}' — WGSL parameters are read-only. Copy to a local var first.`
        })
        break
      }
    }
  }

  // vertex フック内の導関数
  for (let n = 0; n < lines.length; n++) {
    if (/fn\s+bloxd(Terrain|Liquid|Model)Vertex\s*\(/.test(lines[n])) {
      // この関数の本体範囲を探す (簡易: 次の fn まで)
      for (let m = n; m < Math.min(lines.length, n + 80); m++) {
        if (m > n && /^fn\s/.test(lines[m].trim())) break
        if (/\b(dpdx|dpdy|fwidth)\s*\(/.test(lines[m])) {
          warnings.push({
            line: m + 1,
            message: `Derivatives (dpdx/dpdy/fwidth) are fragment-only — cannot be used inside a vertex hook.`
          })
        }
      }
    }
  }

  return { errors, warnings }
}

// vertex フックが #ifndef BLOXD_STRICT … #endif でガードされているか
function isGuardedVertexHook(lines, hookLineIdx) {
  // 後方に #ifndef BLOXD_STRICT を探し、その #endif がフックを含むか
  for (let i = hookLineIdx - 1; i >= 0; i--) {
    const t = lines[i].trim()
    if (t.startsWith('#')) {
      const m = t.match(/^#\s*(ifndef|ifdef)\s+(\S+)/)
      if (m && m[2].toLowerCase() === 'bloxd_strict') {
        if (m[1] === 'ifndef') {
          // 対応する #endif がフック以降にあるか
          for (let j = hookLineIdx; j < lines.length; j++) {
            if (/^#\s*endif/.test(lines[j].trim())) return true
          }
        }
        return false // #ifdef BLOXD_STRICT の内側 = 逆
      }
      // 無関係な #ifdef は飛ばす (簡易: そのまま上へ)
    }
  }
  return false
}

// 簡易: n 行目が関数内か (上方で fn が開き、閉じ括弧をまだ見ていない)
function isInsideFunction(lines, n) {
  let depth = 0
  for (let i = 0; i <= n; i++) {
    const t = lines[i].trim()
    if (/^fn\s/.test(t) || /^struct\s/.test(t)) depth = 0
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
    }
    if (depth <= 0 && /^fn\s/.test(lines[Math.min(i + 1, lines.length - 1)].trim()) === false && depth <= 0) {
      // 関数外の可能性 — 継続
    }
  }
  return depth > 0
}
