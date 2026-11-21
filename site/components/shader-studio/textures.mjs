// 実アトラス読み込み — bloxd.io 本番と同一のデータ・同一のデコード経路。
//
// データ: 本番ビルド v98qt8 の pre-built default atlas (bundle chunk 49,
// module 28312) から抽出した 5 枚のアトラス縦ストリップ (8 x 2048, 8x8 タイル)。
// textureNameToIndex (1227 名 → 0 基準スロット) は同ビルドの
// builtTextureIndexFingerprint (DJB2 = 13d4e18f) と完全一致を検証済み。
//
// デコード経路は本番ローダー (main.js texture-pack manager) と同一:
//   fetch → decodeImage (createImageBitmap) → canvas 2D context →
//   drawImage → getImageData → 8x8 スライス → texture_2d_array へ書き込み
// (本番コード: "await Ki.decodeImage(ni), Vi=Ki.createContext(),
//   Vi.canvas.width=..., Vi.drawImage(Qi,0,0), Vi.getImageData(...).data")
//
// レイヤー構成: スロット s → レイヤー s (0..1226)。studio の textureId は
// s+1 (API 仕様どおり 0 = "no texture")、bloxdSpTextureLayers は恒等写像
// (layers[id] = id-1)。アニメ族は本番と同じく別位置のフレームスロットを
// 指す (registry の frames[])。1227..1239 は studio 専用の余白 (アバター)。
//
// registry.json: { build, fingerprint, count, names:[{name,id,anim,frames,interval}], colors }

import registry from '../../lib/studio/registry.json' with { type: 'json' }
import { basePath } from '../../lib/paths.mjs'

export const ATLAS_TILE = 8
export const ATLAS_STRIPS = 5
export const REAL_LAYERS = registry.count          // 1227 (本番スロット数と一致)
export const ATLAS_LAYERS = 1240                  // 実 1227 + studio 専用余白 13
export const MIP_LEVELS = 4                       // 8, 4, 2, 1

// ---- 簡易ノイズ (決定的。seeded) — 余白タイル (アバター) 専用 ----
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

// --------------------------------------------- 実アトラスのデコード ----
// 本番と同じ decodeImage: createImageBitmap → OffscreenCanvas → getImageData。
// (createImageBitmap 不可の環境では <img> + canvas にフォールバック)
async function decodeStripPixels(url) {
  const img = await (async () => {
    if (typeof createImageBitmap === 'function') {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        return await createImageBitmap(blob)
      } catch (e) { /* fall through to <img> */ }
    }
    return await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`failed to load ${url}`))
      el.src = url
    })
  })()
  const w = img.width, h = img.height
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No 2D context to decode the atlas strip (engine verbatim check)')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h).data
  try { img.close?.() } catch (e) { /* <img> has no close */ }
  return data
}

let _atlasPixelsPromise = null

// 全レイヤー分の生ピクセル (mip0) を一括生成 (本番 blockAtlasPixels 相当)。
// 実 1227 レイヤーはアトラスから、1227..1239 は余白タイル。
export function buildAtlasPixels() {
  if (_atlasPixelsPromise) return _atlasPixelsPromise
  _atlasPixelsPromise = (async () => {
    const pixels = new Uint8ClampedArray(ATLAS_LAYERS * ATLAS_TILE * ATLAS_TILE * 4)
    // 5 本のストリップを並行デコード (本番: Promise.all(blockAtlasUrls.map(decode)))
    const urls = []
    for (let i = 0; i < ATLAS_STRIPS; i++) {
      urls.push(`${basePath}/tools/shader-studio/atlas-${i}.png`)
    }
    const strips = await Promise.all(urls.map(decodeStripPixels))
    const STRIP_TILES = 256
    for (let s = 0; s < REAL_LAYERS; s++) {
      const strip = strips[Math.min(ATLAS_STRIPS - 1, Math.floor(s / STRIP_TILES))]
      const row = s % STRIP_TILES
      const base = s * ATLAS_TILE * ATLAS_TILE * 4
      const src = row * ATLAS_TILE * ATLAS_TILE * 4   // ストリップ幅 8 → 行は連続
      for (let i = 0; i < ATLAS_TILE * ATLAS_TILE * 4; i++) pixels[base + i] = strip[src + i]
    }
    // studio 専用の余白タイル (アバター描画用 — 本番はモデル GLB + Player_Atlas)
    for (const tile of customTiles()) {
      if (tile.frames > 0) {
        for (let f = 0; f < tile.frames; f++) {
          pixels.set(tile.pixelsFor(f), (tile.layer + f) * ATLAS_TILE * ATLAS_TILE * 4)
        }
      } else {
        pixels.set(tile.pixelsFor(0), tile.layer * ATLAS_TILE * ATLAS_TILE * 4)
      }
    }
    return pixels
  })()
  return _atlasPixelsPromise
}

// --------------------------------------------- custom (studio-only) ------
// registry の実レイヤーは本番データで埋め尽くされているため、アバターの
// タイルは余白レイヤー (1227..1239) に置く。id = layer + 1 (1228..1240)。
const CUSTOM_BASE = REAL_LAYERS

export const CUSTOM_LAYERS = {
  player_skin: CUSTOM_BASE + 0,
  player_face: CUSTOM_BASE + 1,
  player_hair: CUSTOM_BASE + 2,
  player_shirt: CUSTOM_BASE + 3,
  player_pants: CUSTOM_BASE + 4,
  player_shoe: CUSTOM_BASE + 5
}

export function customTexId(name) {
  const layer = CUSTOM_LAYERS[name]
  return layer === undefined ? 0 : layer + 1
}

// ---- 手描きタイル (string art: 8 文字 x 8 行、palette 文字 → RGBA) ----
function artToPixels(rows, palette) {
  const buf = new Uint8ClampedArray(ATLAS_TILE * ATLAS_TILE * 4)
  for (let y = 0; y < ATLAS_TILE; y++) {
    const row = rows[y % rows.length]
    for (let x = 0; x < ATLAS_TILE; x++) {
      const key = row[x % row.length] ?? '.'
      const c = palette[key] ?? palette['.']
      const i = (y * ATLAS_TILE + x) * 4
      buf[i] = Math.round(Math.min(1, Math.max(0, c[0])) * 255)
      buf[i + 1] = Math.round(Math.min(1, Math.max(0, c[1])) * 255)
      buf[i + 2] = Math.round(Math.min(1, Math.max(0, c[2])) * 255)
      buf[i + 3] = c[3] === undefined ? 255 : c[3]
    }
  }
  return buf
}

const SKIN_PALETTE = { '.': [0.87, 0.70, 0.53], 'd': [0.80, 0.63, 0.47] }
const SKIN_ROWS = ['................', '.....d......d...', '................',
  '..d.........d...', '................', '.......dd.......',
  '................', '..........d.....']

const HAIR_PALETTE = { '.': [0.23, 0.17, 0.13], 'h': [0.30, 0.23, 0.17], 'l': [0.36, 0.28, 0.20] }
const HAIR_ROWS = ['hhhhhhhhhhhhhhhh', 'hhhhhhhhhhhhhhhh', 'hlhhhhhlhhhlhhhh',
  'hhhhhhhhhhhhhhhh', 'hhhlhhhhhhhhhhhh', 'hhhhhhhhhlhhhhhh',
  'hhhhhhhhhhhhhhhh', 'hhhhhhhhhhhhhhhh']

const FACE_PALETTE = {
  '.': [0.87, 0.70, 0.53], 'd': [0.78, 0.61, 0.45],
  'w': [1.0, 1.0, 1.0], 'e': [0.13, 0.20, 0.45],
  'm': [0.55, 0.38, 0.28], 'h': [0.23, 0.17, 0.13]
}
const FACE_ROWS = [
  'hhhhhhhh',
  'hhhhhhhh',
  '........',
  '........',
  '.w....w.',
  '.e....e.',
  '........',
  '..mmmm..'
]

const SHIRT_PALETTE = { '.': [0.20, 0.55, 0.63], 'd': [0.17, 0.49, 0.57], 'l': [0.24, 0.60, 0.68] }
const SHIRT_ROWS = ['llllllll', '........', '..d..d..', '........',
  '........', '..d..d..', '........', 'llllllll']

const PANTS_PALETTE = { '.': [0.17, 0.22, 0.42], 'd': [0.14, 0.19, 0.36], 'l': [0.20, 0.26, 0.48] }
const PANTS_ROWS = ['........', '........', '..d..d..', '..d..d..',
  '........', '........', '..d..d..', '..d..d..']

const SHOE_PALETTE = { '.': [0.46, 0.41, 0.38], 'd': [0.38, 0.34, 0.31], 'l': [0.55, 0.50, 0.47] }
const SHOE_ROWS = ['........', '........', '........', '........',
  '........', '........', 'dddddddd', 'llllllll']

// カスタムタイルの実体 (余白レイヤー)
export function customTiles() {
  return [
    { layer: CUSTOM_LAYERS.player_skin, frames: 0, name: 'player_skin',
      pixelsFor: () => artToPixels(SKIN_ROWS, SKIN_PALETTE) },
    { layer: CUSTOM_LAYERS.player_hair, frames: 0, name: 'player_hair',
      pixelsFor: () => artToPixels(HAIR_ROWS, HAIR_PALETTE) },
    { layer: CUSTOM_LAYERS.player_face, frames: 0, name: 'player_face',
      pixelsFor: () => artToPixels(FACE_ROWS, FACE_PALETTE) },
    { layer: CUSTOM_LAYERS.player_shirt, frames: 0, name: 'player_shirt',
      pixelsFor: () => artToPixels(SHIRT_ROWS, SHIRT_PALETTE) },
    { layer: CUSTOM_LAYERS.player_pants, frames: 0, name: 'player_pants',
      pixelsFor: () => artToPixels(PANTS_ROWS, PANTS_PALETTE) },
    { layer: CUSTOM_LAYERS.player_shoe, frames: 0, name: 'player_shoe',
      pixelsFor: () => artToPixels(SHOE_ROWS, SHOE_PALETTE) }
  ]
}

// mip チェーン (8,4,2,1) を box フィルタで生成 (レイヤー = タイル単位で
// 生成するため隣接タイルとの滲みなし — 本番もタイル単位の array)。
export function buildMips(layerPixels) {
  const mips = [layerPixels]
  let cur = layerPixels
  let size = ATLAS_TILE
  while (size > 1) {
    const srcSize = size
    size /= 2
    const next = new Uint8ClampedArray(ATLAS_LAYERS * size * size * 4)
    for (let layer = 0; layer < ATLAS_LAYERS; layer++) {
      const src = layer * srcSize * srcSize * 4
      const dst = layer * size * size * 4
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const sx = x * 2, sy = y * 2
          const i00 = src + (sy * srcSize + sx) * 4
          const i10 = i00 + 4
          const i01 = i00 + srcSize * 4
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
  }
  return mips
}

// anim 族情報 (bloxdSpTextureLayers の更新用)。registry の frames は
// studio id (= slot+1) の配列で、本番のアニメーション状態列 (state 0 は
// base スロット、state 1.. は animStart..) と同一の並び。
export function animLadderInfo() {
  const out = []
  for (const n of registry.names) {
    if (n.anim && Array.isArray(n.frames) && n.frames.length > 1) {
      out.push({ id: n.id, frameLayers: n.frames.map(id => id - 1), interval: n.interval || 200, name: n.name })
    }
  }
  return out
}

export { registry }
