// プロシージャル・ブロックテクスチャ生成。
// レジストリ (911名、bny9u実測ID) の名前→色 (実アトラスの averageColors 由来)
// から 16x16 RGBA を生成し、texture_2d_array の1232レイヤー分を埋める。
// 「ID体系と色は実測、パターンはブロックらしさを持たせた生成」。
//
// registry.json: { build, names: [{name,id,anim,rot}], colors: {name:[r,g,b]} }

import registry from '../../lib/studio/registry.json' with { type: 'json' }

export const ATLAS_TILE = 16
export const ATLAS_LAYERS = 1232

// ---- 簡易ノイズ (決定的。seeded) ----
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// 名前からパターン種別を決める
function patternKind(name) {
  if (/grass_top|mycelium|podzol|moss/.test(name)) return 'noise'
  if (/grass_side|path_side|snow_side/.test(name)) return 'band_top'
  if (/planks|log_side|wood/.test(name) && !/top/.test(name)) return 'vertical_stripes'
  if (/log_top|wood.*top/.test(name)) return 'rings'
  if (/bricks|brick$|stone_bricks|glazed/.test(name)) return 'bricks'
  if (/cobble|gravel|slate|cluster|ore|deepslate/.test(name)) return 'cobble'
  if (/sand$|sand|ash|soul_sand/.test(name)) return 'fine_noise'
  if (/leaves|vine|fern/.test(name)) return 'leafy'
  if (/water/.test(name)) return 'water'
  if (/lava|magma/.test(name)) return 'lava'
  if (/glass/.test(name)) return 'glass'
  if (/wool|carpet/.test(name)) return 'soft_noise'
  if (/crafting|table|furnace|chest|anvil/.test(name)) return 'panel'
  if (/portal/.test(name)) return 'swirl'
  if (/tnt/.test(name)) return 'tnt'
  if (/melon|pumpkin/.test(name) && !/top/.test(name)) return 'melon'
  return 'noise'
}

// 1テクスチャ (16x16 RGBA Uint8ClampedArray 1024B) を生成
export function generateTile(name, color) {
  const [r0, g0, b0] = color
  const rnd = mulberry32(hashStr(name))
  const kind = patternKind(name)
  const buf = new Uint8ClampedArray(ATLAS_TILE * ATLAS_TILE * 4)

  const vary = (v, amp) => Math.max(0, Math.min(1, v + (rnd() - 0.5) * amp))

  for (let y = 0; y < ATLAS_TILE; y++) {
    for (let x = 0; x < ATLAS_TILE; x++) {
      let r = r0, g = g0, b = b0, a = 255
      switch (kind) {
        case 'noise': {
          const n = (rnd() - 0.5) * 0.22
          r += n; g += n * 1.15; b += n * 0.8
          break
        }
        case 'fine_noise': {
          const n = (rnd() - 0.5) * 0.12
          r += n; g += n; b += n
          // 点在する小石
          if (rnd() > 0.985) { r *= 0.8; g *= 0.8; b *= 0.8 }
          break
        }
        case 'band_top': { // 上部が緑/下部が土
          if (y < 5 + Math.floor(rnd() * 2)) { r = 0.36 * (1 + (rnd() - 0.5) * 0.3); g = 0.55 * (1 + (rnd() - 0.5) * 0.3); b = 0.21 }
          else { const n = (rnd() - 0.5) * 0.18; r += n; g += n; b += n }
          break
        }
        case 'vertical_stripes': {
          const stripe = (x % 4 === 0) ? -0.16 : (x % 4 === 2 ? 0.07 : 0)
          const grain = (rnd() - 0.5) * 0.10
          r += stripe + grain; g += stripe + grain; b += stripe * 0.8 + grain
          break
        }
        case 'rings': {
          const dx = x - 7.5, dy = y - 7.5
          const d = Math.sqrt(dx * dx + dy * dy)
          const ring = Math.sin(d * 1.9) * 0.09
          r += ring; g += ring; b += ring * 0.9
          break
        }
        case 'bricks': {
          const row = Math.floor(y / 4)
          const off = (row % 2) * 4
          const isMortar = (y % 4 === 0) || ((x + off) % 8 === 0)
          if (isMortar) { r *= 0.72; g *= 0.72; b *= 0.72 }
          else { const n = (rnd() - 0.5) * 0.08; r += n; g += n; b += n }
          break
        }
        case 'cobble': {
          const cell = ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0) ? 0.1 : -0.08
          const n = (rnd() - 0.5) * 0.16
          r += cell + n; g += cell + n; b += cell + n
          break
        }
        case 'leafy': {
          const n = (rnd() - 0.5) * 0.34
          r += n * 0.9; g += n; b += n * 0.7
          if (rnd() > 0.94) { r *= 0.55; g *= 0.6; b *= 0.45 } // 隙間っぽい暗点
          break
        }
        case 'water': {
          const w = Math.sin((x + y * 2) * 0.8) * 0.06 + (rnd() - 0.5) * 0.04
          r += w * 0.6; g += w; b += w * 1.3
          a = 165
          break
        }
        case 'lava': {
          const w = Math.sin((x * 1.7 + y * 0.9)) * 0.5 + 0.5
          r = r0 * (0.8 + w * 0.4); g = g0 * (0.5 + w * 0.9); b = b0 * (0.3 + w * 0.5)
          break
        }
        case 'glass': {
          const edge = (x === 0 || y === 0 || x === 15 || y === 15)
          if (edge) { r *= 0.8; g *= 0.85; b *= 0.9; a = 200 }
          else if (x === 1 || y === 1) { r = Math.min(1, r + 0.25); g = Math.min(1, g + 0.25); b = Math.min(1, b + 0.25); a = 140 }
          else a = 55
          break
        }
        case 'panel': {
          if (x === 0 || y === 0 || x === 15 || y === 15) { r *= 0.55; g *= 0.5; b *= 0.5 }
          else if (y === 7 || y === 8) { r *= 0.8; g *= 0.75; b *= 0.7 }
          else { const n = (rnd() - 0.5) * 0.08; r += n; g += n; b += n }
          break
        }
        case 'swirl': {
          const dx = x - 7.5, dy = y - 7.5
          const d = Math.sqrt(dx * dx + dy * dy)
          const s = Math.sin(d * 1.2 + Math.atan2(dy, dx) * 2) * 0.5 + 0.5
          r = vary(r0 * (0.5 + s * 0.8), 0.1); g = vary(g0 * (0.5 + s * 0.8), 0.1); b = vary(b0 * (0.6 + s * 0.7), 0.1)
          if (d > 7.4) { r *= 0.3; g *= 0.3; b *= 0.3 }
          break
        }
        case 'tnt': {
          if (y < 4 || y > 11) { r = 0.72; g = 0.72; b = 0.72 }
          else { r = 0.82; g = 0.18; b = 0.14 }
          if (y >= 6 && y <= 9 && x >= 5 && x <= 10) { r = 0.25; g = 0.22; b = 0.2 }
          break
        }
        case 'melon': {
          const stripe = ((x + Math.floor(y / 8)) % 4 < 2) ? 0.85 : 1.0
          r *= stripe; g *= stripe; b *= stripe
          break
        }
        default: {
          const n = (rnd() - 0.5) * 0.16
          r += n; g += n; b += n
        }
      }
      const i = (y * ATLAS_TILE + x) * 4
      buf[i] = Math.round(Math.max(0, Math.min(1, r)) * 255)
      buf[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255)
      buf[i + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255)
      buf[i + 3] = a
    }
  }
  return buf
}

// 全1232レイヤー分の生ピクセル (mip0) を一括生成。
// id→レイヤーは identity (layer = id-1)。名前の無いレイヤー (追加フレーム・
// 回転コピー) は root の色で代用 (anim/rot は bloxdTexel 側で処理)。
export function buildAtlasPixels() {
  const layers = new Uint8ClampedArray(ATLAS_LAYERS * ATLAS_TILE * ATLAS_TILE * 4)
  const byLayer = new Array(ATLAS_LAYERS)
  for (const { name, id } of registry.names) {
    const layer = id - 1
    if (layer >= 0 && layer < ATLAS_LAYERS) byLayer[layer] = name
  }
  // アニメーション族: root id のレイヤーから始まる連続フレームを同色バリエーションで埋める
  const animFrames = new Map()
  for (const { name, id, anim } of registry.names) {
    if (anim) for (let f = 0; f < anim; f++) animFrames.set(id - 1 + f, { name, frame: f, frames: anim })
  }
  for (let layer = 0; layer < ATLAS_LAYERS; layer++) {
    const base = layer * ATLAS_TILE * ATLAS_TILE * 4
    const name = byLayer[layer]
    if (name) {
      const color = registry.colors[name] ?? [0.6, 0.6, 0.62]
      const px = generateTile(name, color)
      layers.set(px, base)
    } else if (animFrames.has(layer)) {
      const { name, frame, frames } = animFrames.get(layer)
      const color = registry.colors[name] ?? [0.8, 0.4, 0.1]
      // フレームで明度が波打つ (アニメの「めくる」感)
      const k = 1 + Math.sin((frame / frames) * Math.PI * 2) * 0.12
      const px = generateTile(name + '#' + frame, [color[0] * k, color[1] * k, color[2] * k])
      layers.set(px, base)
    } else {
      // 名前の無いレイヤー (回転コピー等): 中性グレー
      const px = generateTile('anon' + layer, [0.55, 0.55, 0.57])
      layers.set(px, base)
    }
  }
  return layers
}

// mip チェーン (16,8,4,2) を box フィルタで生成
export function buildMips(layerPixels) {
  const mips = [layerPixels]
  let cur = layerPixels
  let size = ATLAS_TILE
  while (size > 2) {
    size /= 2
    const next = new Uint8ClampedArray(cur.length / 4)
    const scale = ATLAS_TILE / size
    for (let layer = 0; layer < ATLAS_LAYERS; layer++) {
      const src = layer * ATLAS_TILE * ATLAS_TILE * 4
      const dst = layer * size * size * 4
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // 2x2ボックス (前のmipから)
          const sx = x * 2, sy = y * 2
          const i00 = src + (sy * ATLAS_TILE + sx) * 4
          const i10 = i00 + 4
          const i01 = i00 + ATLAS_TILE * 4
          const i11 = i01 + 4
          const o = dst + (y * size + x) * 4
          for (let c = 0; c < 4; c++) {
            next[o + c] = (cur[i00 + c] + cur[i10 + c] + cur[i01 + c] + cur[i11 + c]) / 4
          }
        }
      }
    }
    mips.push(next)
    cur = next
    void scale
  }
  return mips
}

// anim 族のフレームレート情報 (bloxdSpTextureLayers の毎フレーム更新用):
// id → rootレイヤー (registry由来)
export function animLadderInfo() {
  const out = []
  for (const { name, id, anim } of registry.names) {
    if (anim) out.push({ id, rootLayer: id - 1, frames: anim, name })
  }
  return out
}

export { registry }
