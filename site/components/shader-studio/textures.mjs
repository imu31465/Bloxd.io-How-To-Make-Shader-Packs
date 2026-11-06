// プロシージャル・ブロックテクスチャ生成。
// レジストリ (911名、bny9u実測ID) の名前→色 (実アトラスの averageColors 由来)
// から 16x16 RGBA を生成し、texture_2d_array の1232レイヤー分を埋める。
// ID体系と色は実測。パターンは bloxd の「ざっくりピクセルアート」風を
// 手作りした生成 (平均色を中間トーンに、明暗を ±20〜35% で乗せる)。
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

// 平均色が実物とズレている (スポット混ざりの平均) テクスチャの色上書き。
// 実測 ID はそのまま、見た目のベース色だけ差し替える。
const COLOR_OVERRIDES = {
  glowstone: [0.94, 0.80, 0.42],
  lava: [0.86, 0.32, 0.06]
}

// 鉱石の斑点色 (スポットはベースの石色に乗せる)
const ORE_SPOT = {
  coal_ore: [0.12, 0.12, 0.13],
  iron_ore: [0.78, 0.58, 0.42],
  gold_ore: [0.99, 0.80, 0.19],
  diamond_ore: [0.42, 0.95, 0.92],
  copper_ore: [0.83, 0.52, 0.36],
  lapis_ore: [0.22, 0.37, 0.85],
  redstone_ore: [0.80, 0.12, 0.10]
}

// 名前からパターン種別を決める
function patternKind(name) {
  if (/grass_top|mycelium|podzol|moss$|mossy_moss/.test(name)) return 'grass'
  if (/grass.*side|path_side|snow_side|dry_grass_block_side/.test(name)) return 'grass_side'
  if (/log_side|log(?!_top)|_log$/.test(name) && !/top/.test(name)) return 'bark'
  if (/log_top|wood.*top/.test(name)) return 'rings'
  if (/planks|wood/.test(name) && !/top/.test(name)) return 'planks'
  if (/bricks|brick$|stone_bricks|glazed/.test(name)) return 'bricks'
  if (/cobble|gravel|slate|cluster|messy_stone/.test(name)) return 'cobble'
  if (/ore/.test(name)) return 'ore'
  if (/sandstone|cut_|chiseled_sand/.test(name)) return 'strata'
  if (/sand$|^sand|ash|soul_sand/.test(name)) return 'sand'
  if (/clay|terracotta|dirt$|coarse|podzol|farmland|mud/.test(name)) return 'claydirt'
  if (/leaves|vine|fern|needles/.test(name)) return 'leafy'
  if (/water/.test(name)) return 'water'
  if (/lava|magma/.test(name)) return 'lava'
  if (/glass/.test(name)) return 'glass'
  if (/wool|carpet/.test(name)) return 'soft_noise'
  if (/crafting|table|furnace|chest|anvil|kiln|drill|bench/.test(name)) return 'panel'
  if (/portal/.test(name)) return 'swirl'
  if (/tnt/.test(name)) return 'tnt'
  if (/melon|pumpkin/.test(name) && !/top/.test(name)) return 'melon'
  if (/bedrock/.test(name)) return 'bedrock'
  if (/snow|ice/.test(name)) return 'fine_noise'
  return 'noise'
}

// ------------------------------------------------------ pixel painting ----
// すべての描画関数は (x, y, rnd, base[r,g,b]) → [r,g,b,a] を返す。
// base は平均色 (上書き後)。明暗は倍率で。
const cl01 = v => v < 0 ? 0 : v > 1 ? 1 : v
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k]

function paintGrass(x, y, rnd, c) {
  // 2x2 ブロック状の控えめなムラ + まばらな点 (TVノイズにしない)
  let k = 1 + (rnd() - 0.5) * 0.08
  if ((x & 1) === 0 && (y & 1) === 0) k *= 1.05
  if (rnd() > 0.94) k *= 0.82 // 暗い点々
  if (rnd() > 0.97) k *= 1.10 // 明るい点々
  return [...shade(c, k), 255]
}

function paintGrassSide(x, y, rnd, c) {
  // 上部は緑、下 3〜4px は土色へギザギザに落ちる (bloxd 側面: ほぼ緑)
  const edge = 12 + ((x * 7 + 3) % 3) // 12..14 行目あたりで土へ
  if (y < edge) return paintGrass(x, y, rnd, c)
  const dirt = [c[0] * 1.35 + 0.10, c[1] * 0.78, c[2] * 0.42] // 緑→土っぽい補正
  let k = 1 + (rnd() - 0.5) * 0.16
  if (rnd() > 0.94) k *= 0.82
  return [...shade(dirt, k), 255]
}

function paintBark(x, y, rnd, c) {
  // 縦の樹皮スジ + 節
  let k = 1
  const col = (x * 5 + 2) % 8
  if (col === 0) k *= 0.66
  else if (col === 4) k *= 1.14
  k *= 1 + (rnd() - 0.5) * 0.10
  if ((x === 11 && y === 6) || (x === 4 && y === 12)) k *= 0.58 // 節
  return [...shade(c, k), 255]
}

function paintRings(x, y, rnd, c) {
  const dx = x - 7.5, dy = y - 7.5
  const d = Math.sqrt(dx * dx + dy * dy)
  let k = 1 + Math.sin(d * 2.1) * 0.10
  if (d > 6.6) k *= 0.72 // 外周の樹皮
  k *= 1 + (rnd() - 0.5) * 0.06
  return [...shade(c, k), 255]
}

function paintPlanks(x, y, rnd, c) {
  // 横板 4px ごか + 交互の縦ジョイント
  let k = 1 + (rnd() - 0.5) * 0.08
  if (y % 4 === 0) k *= 0.74 // 板の境目
  else if (y % 4 === 3) k *= 1.08
  const row = Math.floor(y / 4)
  const joint = (row * 7 + 3) % 16
  if (x === joint && y % 4 !== 0) k *= 0.82
  return [...shade(c, k), 255]
}

function paintBricks(x, y, rnd, c) {
  const row = Math.floor(y / 4)
  const off = (row % 2) * 4
  const isMortar = (y % 4 === 0) || ((x + off) % 8 === 0)
  let k = isMortar ? 0.70 : 1 + (rnd() - 0.5) * 0.10
  if (!isMortar && rnd() > 0.95) k *= 0.9
  return [...shade(c, k), 255]
}

function paintCobble(x, y, rnd, c) {
  // 4x4 石のモザイク、隙間は暗く
  const gx = Math.floor(x / 4), gy = Math.floor(y / 4)
  const cellRnd = mulberry32((gx * 31 + gy * 131) ^ 0x9e37)()
  let k = 0.88 + cellRnd * 0.26
  const lx = x % 4, ly = y % 4
  if (lx === 0 || ly === 0) k *= 0.60 // 隙間
  k *= 1 + (rnd() - 0.5) * 0.05
  return [...shade(c, k), 255]
}

function paintOre(x, y, rnd, c, name) {
  const spot = ORE_SPOT[name] ?? [0.15, 0.15, 0.16]
  // 斑点 4 個所 (2x2 + 隣接 1px) — 位置は名前 hash で固定、分離させて 2x2 が切れないように
  const h = hashStr(name)
  const spots = []
  for (let i = 0; i < 4; i++) {
    spots.push([((h >> (i * 4)) & 15) % 13, ((h >> (i * 4 + 8)) & 15) % 13])
  }
  for (const [sx, sy] of spots) {
    if (x >= sx && x < sx + 2 && y >= sy && y < sy + 2) {
      const inner = (x - sx) + (y - sy)
      let k = inner === 0 ? 1.20 : 0.88
      return [...shade(spot, k), 255]
    }
  }
  return paintStoneBase(x, y, rnd, c)
}

function paintStoneBase(x, y, rnd, c) {
  let k = 1 + (rnd() - 0.5) * 0.12
  if (rnd() > 0.94) k *= 0.88
  return [...shade(c, k), 255]
}

function paintFine(x, y, rnd, c) {
  let k = 1 + (rnd() - 0.5) * 0.07
  if (rnd() > 0.985) k *= 0.88
  if (rnd() > 0.985) k *= 1.07
  return [...shade(c, k), 255]
}

function paintSand(x, y, rnd, c) {
  // 砂: まばらな 2x1 の点々 + 微ノイズ
  let k = 1 + (rnd() - 0.5) * 0.06
  const gx = (x * 7 + y * 13) % 37
  if (gx === 3 || gx === 19) k *= 0.88
  if (gx === 11) k *= 1.06
  return [...shade(c, k), 255]
}

function paintStrata(x, y, rnd, c) {
  // 砂岩の横 Stra 層
  let k = 1 + (rnd() - 0.5) * 0.05
  if (y % 5 === 0) k *= 0.90
  if (y % 5 === 3) k *= 1.05
  return [...shade(c, k), 255]
}

function paintClayDirt(x, y, rnd, c) {
  // 粘土/土: 小石混じりの土
  let k = 1 + (rnd() - 0.5) * 0.14
  const gx = (x * 11 + y * 7) % 23
  if (gx === 5 || gx === 16) k *= 0.80
  if (gx === 11) k *= 1.10
  return [...shade(c, k), 255]
}

function paintLeafy(x, y, rnd, c) {
  // 葉: はっきりした暗い隙間 + まばらな明点 (塊で変化)
  let k = 1 + (rnd() - 0.5) * 0.10
  if ((x & 1) === 1 && (y & 1) === 1) k *= 0.92
  if (rnd() > 0.88) k *= 0.52 // 深い隙間
  else if (rnd() > 0.84) k *= 1.18
  return [...shade(c, k), 255]
}

function paintWater(x, y, rnd, c, frame = 0) {
  // 水: 行ごとに位相のずれた横波 (フレームで縦横 4px ずつ流れる)
  const yy = (y + frame * 4) & 15
  const rowPhase = ((yy * 47) % 13) * 0.55
  const w = Math.sin(x * 0.55 + yy * 1.15 + rowPhase) * 0.5 + 0.5
  const w2 = Math.sin(x * 1.3 - yy * 0.7 + 2.1) * 0.5 + 0.5
  let k = 0.78 + w * 0.30 + w2 * 0.10
  let lift = 0
  if (w > 0.90) { k += 0.08; lift = 0.12 }
  if (w < 0.16) k -= 0.06
  k *= 1 + (rnd() - 0.5) * 0.05
  return [cl01(c[0] * k), cl01(c[1] * k + 0.02), cl01(c[2] * k + lift + 0.04), 190]
}

function paintLava(x, y, rnd, c) {
  const w = Math.sin((x * 1.9 + y * 1.1)) * 0.5 + 0.5
  const w2 = Math.sin((x * 0.7 - y * 1.7 + 2)) * 0.5 + 0.5
  const v = cl01(w * 0.65 + w2 * 0.35)
  const r = cl01(0.55 + v * 0.5), g = cl01(0.16 + v * 0.42), b = cl01(0.03 + v * 0.10)
  return [r, g, b, 255]
}

function paintGlow(x, y, rnd, c) {
  const dx = (x % 8) - 3.5, dy = (y % 8) - 3.5
  const d = Math.sqrt(dx * dx + dy * dy)
  let k = 0.80 + Math.max(0, 1 - d / 4) * 0.36
  k *= 1 + (rnd() - 0.5) * 0.08
  return [...shade(c, k), 255]
}

function paintBedrock(x, y, rnd, c) {
  const gx = Math.floor(x / 2), gy = Math.floor(y / 2)
  const v = mulberry32((gx * 73 + gy * 271) ^ 0x51ed)()
  let k = 0.55 + v * 0.9
  return [...shade(c, k), 255]
}

function paintGlass(x, y, rnd, c) {
  const edge = (x === 0 || y === 0 || x === 15 || y === 15)
  if (edge) return [...shade(c, 0.78), 210]
  // 斜めのハイライト帯
  if (x + y === 6 || x + y === 7) return [...shade(c, 1.25), 120]
  if (x + y === 18 || x + y === 19) return [...shade(c, 1.12), 70]
  return [c[0], c[1], c[2], 42]
}

function paintPanel(x, y, rnd, c) {
  if (x === 0 || y === 0 || x === 15 || y === 15) return [...shade(c, 0.58), 255]
  if (y === 7 || y === 8) return [...shade(c, 0.82), 255]
  return [...shade(c, 1 + (rnd() - 0.5) * 0.08), 255]
}

function paintSwirl(x, y, rnd, c) {
  const dx = x - 7.5, dy = y - 7.5
  const d = Math.sqrt(dx * dx + dy * dy)
  const s = Math.sin(d * 1.2 + Math.atan2(dy, dx) * 2) * 0.5 + 0.5
  let k = 0.5 + s * 0.8
  if (d > 7.4) k = 0.3
  return [...shade(c, k), 255]
}

function paintTnt(x, y) {
  if (y < 4 || y > 11) return [0.72, 0.72, 0.72, 255]
  if (y >= 6 && y <= 9 && x >= 5 && x <= 10) return [0.25, 0.22, 0.2, 255]
  return [0.82, 0.18, 0.14, 255]
}

function paintMelon(x, y, rnd, c) {
  const stripe = ((x + Math.floor(y / 8)) % 4 < 2) ? 0.82 : 1.0
  return [...shade(c, stripe * (1 + (rnd() - 0.5) * 0.06)), 255]
}

function paintSoft(x, y, rnd, c) {
  let k = 1 + (rnd() - 0.5) * 0.08
  return [...shade(c, k), 255]
}

function paintNoise(x, y, rnd, c) {
  let k = 1 + (rnd() - 0.5) * 0.20
  if (rnd() > 0.95) k *= 0.85
  return [...shade(c, k), 255]
}

// 1テクスチャ (16x16 RGBA Uint8ClampedArray 1024B) を生成
export function generateTile(name, color, frame = 0) {
  const base = COLOR_OVERRIDES[name] ?? color
  const c = [base[0], base[1], base[2]]
  const kind = patternKind(name)
  const rnd = mulberry32(hashStr(name) + frame * 7919)
  const buf = new Uint8ClampedArray(ATLAS_TILE * ATLAS_TILE * 4)

  for (let y = 0; y < ATLAS_TILE; y++) {
    for (let x = 0; x < ATLAS_TILE; x++) {
      let px
      switch (kind) {
        case 'grass': px = paintGrass(x, y, rnd, c); break
        case 'grass_side': px = paintGrassSide(x, y, rnd, c); break
        case 'bark': px = paintBark(x, y, rnd, c); break
        case 'rings': px = paintRings(x, y, rnd, c); break
        case 'planks': px = paintPlanks(x, y, rnd, c); break
        case 'bricks': px = paintBricks(x, y, rnd, c); break
        case 'cobble': px = paintCobble(x, y, rnd, c); break
        case 'ore': px = paintOre(x, y, rnd, c, name); break
        case 'fine_noise': px = paintFine(x, y, rnd, c); break
        case 'sand': px = paintSand(x, y, rnd, c); break
        case 'strata': px = paintStrata(x, y, rnd, c); break
        case 'claydirt': px = paintClayDirt(x, y, rnd, c); break
        case 'leafy': px = paintLeafy(x, y, rnd, c); break
        case 'water': px = paintWater(x, y, rnd, c, frame); break
        case 'lava': px = paintLava(x, y, rnd, c); break
        case 'glass': px = paintGlass(x, y, rnd, c); break
        case 'panel': px = paintPanel(x, y, rnd, c); break
        case 'swirl': px = paintSwirl(x, y, rnd, c); break
        case 'tnt': px = paintTnt(x, y); break
        case 'melon': px = paintMelon(x, y, rnd, c); break
        case 'bedrock': px = paintBedrock(x, y, rnd, c); break
        case 'glow': px = paintGlow(x, y, rnd, c); break
        case 'soft_noise': px = paintSoft(x, y, rnd, c); break
        default: px = paintNoise(x, y, rnd, c); break
      }
      // glowstone は発光風のまだら
      if (name === 'glowstone') px = paintGlow(x, y, rnd, c)
      const i = (y * ATLAS_TILE + x) * 4
      buf[i] = Math.round(cl01(px[0]) * 255)
      buf[i + 1] = Math.round(cl01(px[1]) * 255)
      buf[i + 2] = Math.round(cl01(px[2]) * 255)
      buf[i + 3] = px[3]
    }
  }
  return buf
}

// --------------------------------------------- custom (non-registry) ------
// registry に無いがシーンに必要なテクスチャ (水・木材の年輪・プレイヤー) を
// 未使用レイヤーに置く。id = layer + 1 なので bloxdSpTextureLayers の
// identity マッピング (layer = id-1) をそのまま通る。
function computeFreeLayers() {
  const used = new Set()
  for (const { id, anim } of registry.names) {
    used.add(id)
    if (anim) for (let f = 0; f < anim; f++) used.add(id + f)
  }
  const free = []
  for (let layer = 0; layer < ATLAS_LAYERS; layer++) if (!used.has(layer + 1)) free.push(layer)
  return free
}

const FREE_LAYERS = computeFreeLayers()

// 水は 4 フレーム分の連続レイヤーが必要 → 末尾の連続空き run を探す
function findRun(len) {
  let run = []
  for (let i = FREE_LAYERS.length - 1; i >= 0; i--) {
    const layer = FREE_LAYERS[i]
    if (run.length && run[0] - layer === 1) run.unshift(layer)
    else run = [layer]
    if (run.length >= len) return run
  }
  return null
}

const WATER_RUN = findRun(4) // 4 フレーム
const WATER_BASE_LAYER = WATER_RUN[WATER_RUN.length - 4]
// 単発タイルは残りの空きから (水 run を避ける)
const singles = FREE_LAYERS.filter(l => l < WATER_BASE_LAYER)
const SINGLE_LAYERS = singles.slice(-10)

export const CUSTOM_LAYERS = {
  water: WATER_BASE_LAYER,
  log_top: SINGLE_LAYERS[0],
  player_skin: SINGLE_LAYERS[1],
  player_face: SINGLE_LAYERS[2],
  player_hair: SINGLE_LAYERS[3],
  player_shirt: SINGLE_LAYERS[4],
  player_pants: SINGLE_LAYERS[5],
  player_shoe: SINGLE_LAYERS[6]
}

// id (= layer+1) を返すヘルパー
export function customTexId(name) {
  const layer = CUSTOM_LAYERS[name]
  return layer === undefined ? 0 : layer + 1
}

// ---- 手描きタイル (string art: 16 文字 x 16 行、palette 文字 → RGBA) ----
function artToPixels(rows, palette) {
  const buf = new Uint8ClampedArray(ATLAS_TILE * ATLAS_TILE * 4)
  for (let y = 0; y < 16; y++) {
    const row = rows[y]
    for (let x = 0; x < 16; x++) {
      const key = row[x] ?? '.'
      const c = palette[key] ?? palette['.']
      const i = (y * 16 + x) * 4
      buf[i] = Math.round(cl01(c[0]) * 255)
      buf[i + 1] = Math.round(cl01(c[1]) * 255)
      buf[i + 2] = Math.round(cl01(c[2]) * 255)
      buf[i + 3] = c[3] === undefined ? 255 : c[3]
    }
  }
  return buf
}

const LOG_TOP_PALETTE = {
  '.': [0.62, 0.48, 0.28],
  'd': [0.44, 0.32, 0.17],
  'b': [0.36, 0.26, 0.13],
  'l': [0.72, 0.58, 0.36]
}
const LOG_TOP_ROWS = [
  'bbbbbbbbbbbbbbbb',
  'b..............b',
  'b....dddddd....b',
  'b...d......d...b',
  'b..d..llll..d..b',
  'b..d.l....l.d..b',
  'b..d.l.dd.l.d..b',
  'b..d.l.dd.l.d..b',
  'b..d.l....l.d..b',
  'b..d..llll..d..b',
  'b...d......d...b',
  'b....dddddd....b',
  'b..............b',
  'b..............b',
  'b..............b',
  'bbbbbbbbbbbbbbbb'
]

const PLAYER_SKIN = { '.': [0.87, 0.70, 0.53], 'd': [0.80, 0.63, 0.47] }
const SKIN_ROWS = Array(16).fill('................').map((r, y) => {
  return r.split('').map((ch, x) => ((x * 7 + y * 13) % 17 === 0) ? 'd' : '.').join('')
})

const HAIR_PALETTE = { '.': [0.23, 0.17, 0.13], 'h': [0.30, 0.23, 0.17], 'l': [0.36, 0.28, 0.20] }
const HAIR_ROWS = Array(16).fill('................').map((r, y) => {
  return r.split('').map((ch, x) => ((x + y * 3) % 7 === 0) ? 'l' : ((x * 3 + y) % 5 === 0) ? 'h' : '.').join('')
})

// bloxd 標準アバター風の顔: 髪 + 白目/紺瞳 + 口
const FACE_PALETTE = {
  '.': [0.87, 0.70, 0.53],
  'd': [0.78, 0.61, 0.45],
  'w': [1.0, 1.0, 1.0],
  'e': [0.13, 0.20, 0.45],
  'm': [0.55, 0.38, 0.28],
  'h': [0.23, 0.17, 0.13]
}
const FACE_ROWS = [
  'hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhhhh',
  'hh............hh',
  'h..............h',
  '................',
  '................',
  '..ww........ww..',
  '..we........we..',
  '..ee........ee..',
  '................',
  '................',
  '.....d....d.....',
  '......mmmm......',
  '................',
  '................'
]

// bloxd アバター風: 服はほぼ無地 + 微かなムラ (ディテールは顔と髪に任せる)
const SHIRT_PALETTE = { '.': [0.20, 0.55, 0.63], 'd': [0.17, 0.49, 0.57], 'l': [0.24, 0.60, 0.68] }
const SHIRT_ROWS = Array(16).fill('................').map((r, y) => {
  return r.split('').map((ch, x) => ((x * 5 + y * 11) % 19 === 0) ? 'd' : ((x * 3 + y) % 23 === 0) ? 'l' : '.').join('')
})

const PANTS_PALETTE = { '.': [0.17, 0.22, 0.42], 'd': [0.14, 0.19, 0.36], 'l': [0.20, 0.26, 0.48] }
const PANTS_ROWS = Array(16).fill('................').map((r, y) => {
  return r.split('').map((ch, x) => ((x * 7 + y * 5) % 19 === 0) ? 'd' : ((x + y * 5) % 23 === 0) ? 'l' : '.').join('')
})

const SHOE_PALETTE = { '.': [0.46, 0.41, 0.38], 'd': [0.38, 0.34, 0.31], 'l': [0.55, 0.50, 0.47] }
const SHOE_ROWS = Array(16).fill('................').map((r, y) => {
  return r.split('').map((ch, x) => ((x * 3 + y * 7) % 9 === 0) ? 'd' : ((x * 5 + y) % 6 === 0) ? 'l' : '.').join('')
})

// カスタムタイルの実体
export function customTiles() {
  const waterColor = [0.19, 0.40, 0.86]
  return [
    { layer: CUSTOM_LAYERS.water, frames: 4, name: 'water',
      pixelsFor: f => generateTile('studio_water', waterColor, f) },
    { layer: CUSTOM_LAYERS.log_top, frames: 0, name: 'log_top',
      pixelsFor: () => artToPixels(LOG_TOP_ROWS, LOG_TOP_PALETTE) },
    { layer: CUSTOM_LAYERS.player_skin, frames: 0, name: 'player_skin',
      pixelsFor: () => artToPixels(SKIN_ROWS, PLAYER_SKIN) },
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

// 全1232レイヤー分の生ピクセル (mip0) を一括生成。
export function buildAtlasPixels() {
  const layers = new Uint8ClampedArray(ATLAS_LAYERS * ATLAS_TILE * ATLAS_TILE * 4)
  const byLayer = new Array(ATLAS_LAYERS)
  for (const { name, id } of registry.names) {
    const layer = id - 1
    if (layer >= 0 && layer < ATLAS_LAYERS) byLayer[layer] = name
  }
  // アニメーション族: root id から始まる連続フレーム。frames を名前持ち
  // エントリより優先する (lava は anim=8 で ids 1-8 を専有するが、その間に
  // 別の名前 (portal 等) が並んでいるため、名前優先だと溶岩が化ける)。
  const animFrames = new Map()
  for (const { name, id, anim } of registry.names) {
    if (anim) for (let f = 0; f < anim; f++) animFrames.set(id - 1 + f, { name, frame: f, frames: anim })
  }
  for (let layer = 0; layer < ATLAS_LAYERS; layer++) {
    const base = layer * ATLAS_TILE * ATLAS_TILE * 4
    if (animFrames.has(layer)) {
      const { name, frame, frames } = animFrames.get(layer)
      const color = registry.colors[name] ?? [0.8, 0.4, 0.1]
      const k = 1 + Math.sin((frame / frames) * Math.PI * 2) * 0.12
      layers.set(generateTile(name + '#' + frame, [color[0] * k, color[1] * k, color[2] * k], frame), base)
    } else {
      const name = byLayer[layer]
      if (name) {
        const color = registry.colors[name] ?? [0.6, 0.6, 0.62]
        layers.set(generateTile(name, color), base)
      } else {
        const px = generateTile('anon' + layer, [0.55, 0.55, 0.57])
        layers.set(px, base)
      }
    }
  }
  // カスタムタイル (未使用レイヤーへ上書き)
  for (const tile of customTiles()) {
    if (tile.frames > 0) {
      for (let f = 0; f < tile.frames; f++) {
        layers.set(tile.pixelsFor(f), (tile.layer + f) * ATLAS_TILE * ATLAS_TILE * 4)
      }
    } else {
      layers.set(tile.pixelsFor(0), tile.layer * ATLAS_TILE * ATLAS_TILE * 4)
    }
  }
  return layers
}

// mip チェーン (16,8,4,2) を box フィルタで生成。
// 各レベルで「ソース側のレイヤー内ストライド」は直前の mip サイズ (16→8→4)。
// 以前の実装は常に 16 を使っており、mip2 以降が壊れていた (遠景テクスチャが
// 化ける原因)。距離ベース mipLevel を有効にしたためここが効く。
export function buildMips(layerPixels) {
  const mips = [layerPixels]
  let cur = layerPixels
  let size = ATLAS_TILE
  while (size > 2) {
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

// anim 族のフレームレート情報 (bloxdSpTextureLayers の毎フレーム更新用)。
// registry 由来 + カスタムの水 (4フレーム) を足す。
export function animLadderInfo() {
  const out = []
  for (const { name, id, anim } of registry.names) {
    if (anim) out.push({ id, rootLayer: id - 1, frames: anim, name })
  }
  out.push({ id: CUSTOM_LAYERS.water + 1, rootLayer: CUSTOM_LAYERS.water, frames: 4, name: 'water' })
  return out
}

export { registry }
