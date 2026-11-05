// シーン生成: 手作りバイオーム 7 種 + 手続型 (シード) 地形 + モデル。
// ブロック配置から3プログラム (terrain/liquid/model) のメッシュを生成する。
//
// ブロックの世界: y up、1ブロック=1単位。render position は原点中心に
// なるようブロック座標から offset を引いたもの (renderOffset の役割を再現)。

import { registry } from './textures.mjs'

const texId = name => {
  const e = registry.names.find(n => n.name === name)
  return e ? e.id : 0
}

// フラグビット (BloxdFlags の 14 bool と同じ順)
export const FLAG = {
  OPAQUE: 0, EMISSIVE: 1, VEGETATION: 2, DIRT: 3, SAND: 4, ROCK: 5,
  SLAB: 6, STAIRS: 7, FLAT: 8, PLACED: 9, HELD: 10, DROPPED: 11, THROWN: 12, LIFEFORM: 13
}

// ブロック種別定義: tex面 (top/side/bottom), フラグ, 光
const BLOCKS = {
  grass: { top: 'grass_top', side: 'grass_side', bottom: 'dirt', flags: [FLAG.VEGETATION, FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  dirt: { top: 'dirt', side: 'dirt', bottom: 'dirt', flags: [FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  coarse: { top: 'coarse_dirt', side: 'coarse_dirt', bottom: 'coarse_dirt', flags: [FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  stone: { top: 'stone', side: 'stone', bottom: 'stone', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  cobble: { top: 'cobblestone', side: 'cobblestone', bottom: 'cobblestone', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  mossy: { top: 'mossy_cobblestone', side: 'mossy_cobblestone', bottom: 'mossy_cobblestone', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  stonebrick: { top: 'stone_bricks', side: 'stone_bricks', bottom: 'stone_bricks', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  cracked: { top: 'cracked_stone_bricks', side: 'cracked_stone_bricks', bottom: 'cracked_stone_bricks', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  chiseled: { top: 'chiseled_stone_bricks', side: 'chiseled_stone_bricks', bottom: 'chiseled_stone_bricks', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  sand: { top: 'sand', side: 'sand', bottom: 'sand', flags: [FLAG.SAND, FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  sandstone: { top: 'sandstone_top', side: 'sandstone_side', bottom: 'sandstone_bottom', flags: [FLAG.SAND, FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  bedrock: { top: 'bedrock', side: 'bedrock', bottom: 'bedrock', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  oaklog: { top: 'oak_log_top', side: 'oak_log_side', bottom: 'oak_log_top', flags: [FLAG.OPAQUE, FLAG.PLACED] },
  oakplank: { top: 'oak_planks', side: 'oak_planks', bottom: 'oak_planks', flags: [FLAG.OPAQUE, FLAG.PLACED] },
  leaves: { top: 'oak_leaves', side: 'oak_leaves', bottom: 'oak_leaves', flags: [FLAG.VEGETATION, FLAG.PLACED] },
  spruceleaves: { top: 'spruce_leaves', side: 'spruce_leaves', bottom: 'spruce_leaves', flags: [FLAG.VEGETATION, FLAG.PLACED] },
  water: { top: 'water', side: 'water', bottom: 'water', flags: [FLAG.PLACED], liquid: true },
  lava: { top: 'lava', side: 'lava', bottom: 'lava', flags: [FLAG.EMISSIVE, FLAG.ROCK, FLAG.PLACED], light: [14, 8, 2] },
  glowstone: { top: 'glowstone', side: 'glowstone', bottom: 'glowstone', flags: [FLAG.EMISSIVE, FLAG.OPAQUE, FLAG.PLACED], light: [15, 14, 10] },
  torchblock: { top: 'glowstone', side: 'glowstone', bottom: 'glowstone', flags: [FLAG.EMISSIVE, FLAG.PLACED], light: [14, 14, 12] },
  coalore: { top: 'coal_ore', side: 'coal_ore', bottom: 'coal_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  ironore: { top: 'iron_ore', side: 'iron_ore', bottom: 'iron_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  diamondore: { top: 'diamond_ore', side: 'diamond_ore', bottom: 'diamond_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  goldore: { top: 'gold_ore', side: 'gold_ore', bottom: 'gold_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  deepslate: { top: 'deepslate', side: 'deepslate', bottom: 'deepslate', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  gravel: { top: 'gravel', side: 'gravel', bottom: 'gravel', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  cactus: { top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_top', flags: [FLAG.VEGETATION, FLAG.PLACED] },
  snow: { top: 'snow', side: 'snow', bottom: 'snow', flags: [FLAG.OPAQUE, FLAG.PLACED] },
  ice: { top: 'ice', side: 'ice', bottom: 'ice', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  clay: { top: 'clay', side: 'clay', bottom: 'clay', flags: [FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  bricks: { top: 'bricks', side: 'bricks', bottom: 'bricks', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  darkplank: { top: 'spruce_planks', side: 'spruce_planks', bottom: 'spruce_planks', flags: [FLAG.OPAQUE, FLAG.PLACED] }
}

// ---------------------------------------------------------------- scenes --

function key(x, y, z) { return x + ',' + y + ',' + z }

class SceneBuilder {
  constructor() {
    this.blocks = new Map()
    this.lights = [] // {x,y,z, rgb:[0-15]}
    this.models = []
    this.sky = { night: false }
  }
  set(x, y, z, type) { if (type) this.blocks.set(key(x, y, z), type) }
  fill(x0, y0, z0, x1, y1, z1, type) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, type)
  }
  column(x, z, from, to, type) { for (let y = from; y <= to; y++) this.set(x, y, z, type) }
  light(x, y, z, rgb) { this.lights.push({ x, y, z, rgb }) }
  box(x, y, z, type) { this.set(x, y, z, type) }

  // 木 (幹4-5 + 葉っぱ球)
  tree(x, base, z, h = 4, leaf = 'leaves') {
    for (let i = 0; i < h; i++) this.set(x, base + i, z, 'oaklog')
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy <= -1 ? 2 : 1
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < 0) continue
        if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || Math.random() > 0.5)) continue
        const y = base + h + dy - 1
        if (!this.blocks.has(key(x + dx, y, z + dz))) this.set(x + dx, y, z + dz, leaf)
      }
    }
  }
}

function groundLayer(sb, R, type, dirtDepth = 3) {
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    sb.set(x, 0, z, type)
    sb.column(x, z, -dirtDepth, -1, 'dirt')
    sb.set(x, -dirtDepth - 1, z, 'bedrock')
  }
}

export function makePlains() {
  const sb = new SceneBuilder()
  const R = 22
  groundLayer(sb, R, 'grass')
  sb.tree(-8, 1, -6, 5)
  sb.tree(9, 1, 3, 4)
  sb.tree(-3, 1, 10, 5)
  sb.tree(14, 1, -11, 4)
  sb.fill(-2, 1, -2, 0, 1, 0, 'cobble') // 小さな井戸風
  sb.fill(-2, 2, -2, 0, 2, 0, 'water')
  sb.light(-1, 2, -1, [14, 14, 12])
  sb.models.push({ type: 'player', pos: [4, 1, 6], yaw: 2.4 })
  sb.models.push({ type: 'sword', pos: [4, 3.4, 6] })
  sb.models.push({ type: 'drop', pos: [-4, 1.5, 4] })
  return { id: 'plains', builder: sb, camera: [0, 9, 16], lookYaw: -0.15, lookPitch: 0.35 }
}

export function makeForest() {
  const sb = new SceneBuilder()
  const R = 22
  groundLayer(sb, R, 'grass')
  const spots = [[-10, -8], [-7, 2], [-12, 6], [2, -10], [6, -4], [12, -8], [10, 4], [3, 9], [-4, 12], [14, 10], [-16, -2], [7, 13]]
  for (const [x, z] of spots) sb.tree(x, 1, z, 4 + ((x * 31 + z * 17) % 3), (x + z) % 2 ? 'spruceleaves' : 'leaves')
  sb.models.push({ type: 'player', pos: [0, 1, 4], yaw: 0.4 })
  return { id: 'forest', builder: sb, camera: [0, 8, 15], lookYaw: 0.1, lookPitch: 0.28 }
}

export function makeDesert() {
  const sb = new SceneBuilder()
  const R = 24
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const h = Math.round(2 * Math.sin(x * 0.25) * Math.cos(z * 0.2) + 2 * Math.cos((x + z) * 0.12))
    sb.set(x, h, z, 'sand')
    sb.column(x, z, h - 3, h - 1, 'sandstone')
    sb.set(x, h - 4, z, 'bedrock')
  }
  // サボテン
  for (const [cx, cz, h] of [[-6, -3, 3], [5, 6, 2], [-12, 8, 3], [10, -9, 2], [2, -14, 3]]) {
    for (let i = 1; i <= h; i++) sb.set(cx, i + 2, cz, 'cactus')
  }
  // 砂岩の遺跡風アーチ
  sb.fill(-3, 1, -2, 3, 5, -2, 'sandstone')
  sb.set(-2, 1, -2, null); sb.set(2, 1, -2, null)
  sb.set(-2, 2, -2, null); sb.set(2, 2, -2, null)
  sb.set(-2, 3, -2, null); sb.set(2, 3, -2, null)
  sb.set(-2, 4, -2, null); sb.set(2, 4, -2, null)
  sb.fill(-3, 1, -4, -3, 4, -2, 'sandstone')
  sb.fill(3, 1, -4, 3, 4, -2, 'sandstone')
  sb.models.push({ type: 'player', pos: [0, 3, 6], yaw: -2.9 })
  return { id: 'desert', builder: sb, camera: [0, 8, 17], lookYaw: 0, lookPitch: 0.42 }
}

export function makeWaterside() {
  const sb = new SceneBuilder()
  const R = 22
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d = Math.sqrt(x * x + z * z)
    const h = d < 7 ? -2 : d < 9 ? -1 : 0
    if (h < 0) {
      sb.set(x, -3, z, 'clay')
      sb.set(x, h, z, 'water')
      sb.set(x, -4, z, 'bedrock')
    } else {
      sb.set(x, h, z, d < 11 ? 'sand' : 'grass')
      sb.column(x, z, -3, -1, 'dirt')
      sb.set(x, -4, z, 'bedrock')
    }
  }
  sb.fill(7, 1, -2, 9, 3, -2, 'oakplank') // 桟橋
  sb.fill(7, 1, -3, 9, 1, 3, 'oakplank')
  sb.fill(7, 2, -3, 7, 2, 3, 'oakplank')
  sb.fill(9, 2, -3, 9, 2, 3, 'oakplank')
  sb.tree(-9, 1, 5, 4)
  sb.models.push({ type: 'player', pos: [8, 4.3, 0], yaw: -1.5 })
  return { id: 'waterside', builder: sb, camera: [14, 7, 12], lookYaw: -0.6, lookPitch: 0.30 }
}

export function makeRuins() {
  const sb = new SceneBuilder()
  const R = 20
  groundLayer(sb, R, 'grass', 2)
  // 中央神殿風: 石レンガの平台 + 柱 (崩れあり)
  sb.fill(-7, 1, -7, 7, 1, 7, 'stonebrick')
  sb.fill(-7, 2, -7, 7, 2, 7, 'mossy')
  const pillars = [[-5, -5], [5, -5], [-5, 5], [5, 5]]
  for (const [px, pz] of pillars) {
    const h = 3 + ((px + pz + 12) % 3)
    for (let i = 3; i < 3 + h; i++) sb.set(px, i, pz, i % 2 ? 'stonebrick' : 'cracked')
    if (h >= 4) sb.set(px, 3 + h, pz, 'chiseled')
  }
  // 崊れた壁
  sb.fill(-7, 3, -7, -4, 4, -7, 'stonebrick'); sb.set(-5, 4, -7, null); sb.set(-6, 5, -7, 'cracked')
  sb.fill(4, 3, 7, 7, 5, 7, 'mossy')
  // 中央の祭壇 + 光源
  sb.fill(-1, 3, -1, 1, 3, 1, 'chiseled')
  sb.set(0, 4, 0, 'glowstone')
  sb.light(0, 5, 0, [15, 14, 10])
  sb.set(-3, 3, 3, 'torchblock'); sb.light(-3, 4, 3, [14, 14, 12])
  sb.set(3, 3, -3, 'torchblock'); sb.light(3, 4, -3, [14, 14, 12])
  // 走り石など
  sb.set(9, 1, 3, 'mossy'); sb.set(10, 1, 2, 'mossy'); sb.set(11, 1, 0, 'mossy')
  sb.models.push({ type: 'player', pos: [0, 3, 10], yaw: 3.14 })
  sb.models.push({ type: 'sword', pos: [0, 5.4, 0] })
  return { id: 'ruins', builder: sb, camera: [16, 9, 16], lookYaw: -0.72, lookPitch: 0.35 }
}

export function makeNight() {
  const sb = new SceneBuilder()
  const R = 20
  groundLayer(sb, R, 'grass', 2)
  sb.tree(-7, 1, -5, 4)
  sb.tree(8, 1, 4, 5)
  // 松明だち
  const torches = [[-4, -4], [4, -4], [-4, 4], [4, 4], [0, -8], [0, 8]]
  for (const [tx, tz] of torches) { sb.set(tx, 1, tz, 'torchblock'); sb.light(tx, 2, tz, [14, 14, 12]) }
  sb.set(0, 1, 0, 'bricks')
  sb.set(1, 1, 0, 'bricks'); sb.set(1, 2, 0, 'bricks'); sb.set(1, 3, 0, 'bricks')
  sb.set(0, 2, 0, 'glowstone'); sb.light(0, 3, 0, [15, 15, 15])
  sb.models.push({ type: 'player', pos: [-2, 1, 6], yaw: 0.9 })
  sb.sky.night = true
  return { id: 'night', builder: sb, camera: [6, 7, 14], lookYaw: -0.35, lookPitch: 0.22 }
}

export function makeCave() {
  const sb = new SceneBuilder()
  const R = 18
  // 洞窟: y -6..0 の空洞を石で囲む
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const ceil = 4 + Math.round(2 * Math.sin(x * 0.3 + z * 0.21))
    for (let y = -8; y <= ceil; y++) {
      const d = Math.sqrt(x * x + z * z)
      const inCave = y >= -6 && y < ceil - 1 && d < R - 2
      if (!inCave) sb.set(x, y, z, y < -6 ? 'bedrock' : 'stone')
    }
  }
  // 溶岩プール
  sb.fill(-6, -6, -4, 6, -6, 4, 'lava'); sb.light(0, -5, 0, [14, 8, 2])
  sb.set(-8, -6, -6, 'deepslate'); sb.set(-8, -5, -6, 'glowstone'); sb.light(-8, -5, -6, [15, 14, 10])
  // 鉱石脈
  for (const [x, y, z, t] of [[-10, -4, -8, 'coalore'], [-9, -3, -9, 'ironore'], [8, -2, 6, 'diamondore'], [9, -5, 7, 'goldore'], [-6, -2, 9, 'coalore'], [5, -3, -9, 'ironore']]) sb.set(x, y, z, t)
  sb.fill(-2, -5, 2, 2, -5, 2, 'gravel')
  sb.models.push({ type: 'player', pos: [0, -5, 10], yaw: 3.14 })
  return { id: 'cave', builder: sb, camera: [0, -3, 14], lookYaw: 0, lookPitch: -0.15 }
}

// ---- 手続型 (シード) ----
function seeded2D(seed) {
  // 値ノイズ2層 (滑らかな地形用にコサイン補間)
  const rnd = (() => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } })()
  const size = 64
  const grid = new Float32Array((size + 1) * (size + 1))
  for (let i = 0; i < grid.length; i++) grid[i] = rnd()
  const at = (x, z) => grid[((z % size) + size) % size * size + (((x % size) + size) % size)]
  const smooth = t => t * t * (3 - 2 * t)
  return (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z)
    const xf = smooth(x - xi), zf = smooth(z - zi)
    const a = at(xi, zi), b = at(xi + 1, zi), c = at(xi, zi + 1), d = at(xi + 1, zi + 1)
    return (a * (1 - xf) + b * xf) * (1 - zf) + (c * (1 - xf) + d * xf) * zf
  }
}

export function makeProcedural(seed = 1337) {
  const sb = new SceneBuilder()
  const R = 26
  const n1 = seeded2D(seed)
  const n2 = seeded2D(seed * 7919 + 13)
  const waterLevel = 0
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const e = n1(x * 0.09, z * 0.09) * 0.7 + n2(x * 0.28, z * 0.28) * 0.3
    let h = Math.round(e * 12 - 4)
    const d = Math.sqrt(x * x + z * z)
    if (d > R - 3) h = Math.min(h, Math.round((R - d) * 2)) // 縁を下げる
    if (h < waterLevel) {
      sb.set(x, waterLevel, z, 'water')
      sb.column(x, z, h + 1, waterLevel - 1, 'sand')
      sb.column(x, z, Math.min(h, waterLevel - 4), h, 'stone')
      sb.set(x, -9, z, 'bedrock')
    } else {
      const beach = h === waterLevel || h === waterLevel + 1
      sb.set(x, h, z, beach ? 'sand' : 'grass')
      sb.column(x, z, Math.max(h - 3, -8), h - 1, beach ? 'sandstone' : 'dirt')
      sb.column(x, z, -8, Math.max(h - 4, -8) - 1, 'stone')
      sb.set(x, -9, z, 'bedrock')
      // 木・花まかせ
      if (!beach && h > waterLevel + 1 && n2(x * 0.8, z * 0.8) > 0.86 && d < R - 5) {
        sb.tree(x, h + 1, z, 4 + Math.floor(n1(x, z) * 3))
      }
      if (h > 7 && n2(x * 1.3 + 40, z * 1.3) > 0.78) sb.set(x, h, z, 'stone') // 山肌の岩
    }
  }
  sb.models.push({ type: 'player', pos: [6, 9, 10], yaw: -0.6 })
  return { id: 'procedural', builder: sb, camera: [18, 14, 18], lookYaw: -0.8, lookPitch: 0.55, seed }
}

export const SCENES = {
  plains: makePlains,
  forest: makeForest,
  desert: makeDesert,
  waterside: makeWaterside,
  ruins: makeRuins,
  night: makeNight,
  cave: makeCave,
  procedural: makeProcedural
}

// ------------------------------------------------------------ mesh build --

// 面定義: 各面の4頂点 (反時計回り) と法線
const FACES = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uvRot: 0 }, // +x
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uvRot: 0 }, // -x
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uvRot: 1 }, // +y (top)
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uvRot: 1 }, // -y
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uvRot: 0 }, // +z
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uvRot: 0 } // -z
]
const FACE_UVS = [[0, 0], [1, 0], [1, 1], [0, 1]]

// 光レベル: 光源からの距離減衰 (簡易。BFSでなく radius で十分な忠実度)
function lightAt(lights, x, y, z) {
  let r = 0, g = 0, b = 0
  for (const L of lights) {
    const d = Math.sqrt((L.x - x) ** 2 + (L.y - y) ** 2 + (L.z - z) ** 2)
    const level = Math.max(0, (L.rgb[0] + L.rgb[1] + L.rgb[2]) / 3 - d) // 大雑把な半径
    if (level <= 0) continue
    const k = level / 15
    // RGB別 (色光の見た目重視)
    r = Math.max(r, Math.max(0, L.rgb[0] * (1 - d / 16)) / 15)
    g = Math.max(g, Math.max(0, L.rgb[1] * (1 - d / 16)) / 15)
    b = Math.max(b, Math.max(0, L.rgb[2] * (1 - d / 16)) / 15)
    void k
  }
  return [r, g, b]
}

// skyLight: 上面が空いているか (簡易: 列の上に固体が無い → 15)
function skyLightAt(blocks, x, y, z, maxY) {
  for (let yy = Math.ceil(y) + 1; yy <= maxY; yy++) {
    const t = blocks.get(key(x, yy, z))
    if (t && BLOCKS[t]?.flags.includes(FLAG.OPAQUE)) return 2
  }
  return 15
}

// AO: 頂点周囲の固体数 → 0.55..1
function vertexAO(sx, sy, sz, corner, solidAt) {
  // 面の法線方向に押し出した格子で3近傍チェック
  const cx = corner[0] === 1 ? 1 : -1
  const cy = corner[1] === 1 ? 1 : -1
  const cz = corner[2] === 1 ? 1 : -1
  let occ = 0
  if (sx) { // x面: y,z近傍
    occ += solidAt(0, cy, 0) + solidAt(0, 0, cz) + solidAt(0, cy, cz)
  } else if (sy) {
    occ += solidAt(cx, 0, 0) + solidAt(0, 0, cz) + solidAt(cx, 0, cz)
  } else {
    occ += solidAt(cx, 0, 0) + solidAt(0, cy, 0) + solidAt(cx, cy, 0)
  }
  return [1.0, 0.82, 0.68, 0.55][Math.min(occ, 3)]
}

// シーン → 3プログラムの頂点バッファ。
// 頂点レイアウト (エンジンの mesher 相当、32B+4B → ここでは 1 バッファ 44B):
//   position f32×3 | normal f32×3 (エンジンはsnorm8×4だが簡略) |
//   colour u8×4 (unorm) | uv f32×2 | atlasIndex f32 | textureId u32 |
//   textureRotation u32 | mipLevel f32 | flags u32 (bitpack) | lightLevels u32 (nibble pack)
export function buildMeshes(scene) {
  const sb = scene.builder
  const blocks = sb.blocks
  let maxY = 0
  for (const k of blocks.keys()) { const y = Number(k.split(',')[1]); if (y > maxY) maxY = y }

  const solidAt = (x, y, z) => {
    const t = blocks.get(key(x, y, z))
    return t && BLOCKS[t]?.flags.includes(FLAG.OPAQUE) ? 1 : 0
  }
  const opaqueAt = (x, y, z) => solidAt(x, y, z)

  const buffers = { terrain: [], liquid: [], model: [] }
  const indices = { terrain: [], liquid: [], model: [] }

  for (const [k, type] of blocks) {
    const [x, y, z] = k.split(',').map(Number)
    const def = BLOCKS[type]
    if (!def) continue
    const program = def.liquid ? 'liquid' : 'terrain'
    const flagsBits = def.flags.reduce((acc, f) => acc | (1 << f), 0)
    const emissive = def.flags.includes(FLAG.EMISSIVE)

    for (const face of FACES) {
      const [dx, dy, dz] = face.dir
      const nx = x + dx, ny = y + dy, nz = z + dz
      const neighbor = blocks.get(key(nx, ny, nz))
      // 露出判定: 隣が不透明固体なら描かない (水の隣の水も描かない)
      if (neighbor && BLOCKS[neighbor]?.flags.includes(FLAG.OPAQUE)) continue
      if (program === 'liquid' && neighbor === 'water') continue

      const texName = dy === 1 ? def.top : dy === -1 ? def.bottom : def.side
      const id = texId(texName)
      const layer = id - 1
      const texRot = 0

      // 面中心の光
      const lightRGB = emissive ? [1, 1, 1] : lightAt(sb.lights, x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5, z + 0.5 + dz * 0.5)
      const sky = emissive ? 15 : skyLightAt(blocks, x, y, z, maxY)

      const base = buffers[program].length / 12
      for (let ci = 0; ci < 4; ci++) {
        const c = face.corners[ci]
        const ao = def.flags.includes(FLAG.OPAQUE) || program === 'liquid'
          ? vertexAO(dx, dy, dz, c, (ox, oy, oz) => opaqueAt(x + ox + (dx && c[0] === 1 ? 1 : 0) * 0, y + oy, z + oz) && true)
          : 1
        // AOをtintとしてcolourにベイク (エンジンの mesher と同じ: tint×AO)
        const aoF = program === 'liquid' ? Math.max(ao, 0.9) : ao
        const v = [
          x + c[0], y + c[1], z + c[2],
          dx, dy, dz,
          Math.round(255 * aoF), Math.round(255 * aoF), Math.round(255 * aoF), 255, // colour u8n
          FACE_UVS[ci][0], FACE_UVS[ci][1],
          layer, // atlasIndex (f32)
          id, texRot, 0.0, // textureId, rotation, mip
          flagsBits,
          (Math.round(lightRGB[0] * 15) << 24 | Math.round(lightRGB[1] * 15) << 20 |
           Math.round(lightRGB[2] * 15) << 16 | sky << 12) >>> 0,
          0, 0, 0 // localPosition (terrain/liquidは 0)
        ]
        buffers[program].push(...v.map(n => typeof n === 'number' ? n : 0))
      }
      indices[program].push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }

  // モデルメッシュ (プレイヤー・剛・ドロップ)
  const modelMesh = buildModelMeshes(sb.models)

  const pack = {}
  for (const p of ['terrain', 'liquid']) {
    pack[p] = {
      vertices: new Float32Array(buffers[p]),
      indices: new Uint32Array(indices[p])
    }
  }
  pack.model = modelMesh
  return pack
}

// モデル: ブロックモデル/エンティティ風のボックス群。
// 頂点属性は terrain と同じ 11 float (localPosition は model行列でworldに変換後の
// 簡易表現。enchant/overlay はモデルタイプから付与)
function buildModelMeshes(models) {
  const verts = []
  const idx = []
  const FLAG_BITS = {
    player: [FLAG.LIFEFORM, FLAG.PLACED],
    sword: [FLAG.HELD],
    drop: [FLAG.DROPPED],
    torch: [FLAG.HELD]
  }

  function pushBox(cx, cy, cz, sx, sy, sz, texName, flagsBits, extra = {}) {
    const id = texId(texName)
    const layer = id - 1
    const base = verts.length / 12
    for (const face of FACES) {
      const [dx, dy, dz] = face.dir
      for (let ci = 0; ci < 4; ci++) {
        const c = face.corners[ci]
        verts.push(
          cx + (c[0] - 0.5) * sx, cy + (c[1] - 0.5) * sy, cz + (c[2] - 0.5) * sz,
          dx, dy, dz,
          255, 255, 255, 255,
          FACE_UVS[ci][0], FACE_UVS[ci][1],
          layer, id, texRotOf(face), 0.0,
          flagsBits,
          (Math.round((extra.blockLight?.[0] ?? 0) * 15) << 24 | Math.round((extra.blockLight?.[1] ?? 0) * 15) << 20 |
           Math.round((extra.blockLight?.[2] ?? 0) * 15) << 16 | Math.round((extra.skyLight ?? 1) * 15) << 12) >>> 0,
          // localPosition: モデル原点 (モデル中心) からのオフセット
          (c[0] - 0.5) * sx, (c[1] - 0.5) * sy, (c[2] - 0.5) * sz
        )
      }
      const b = base + FACES.indexOf(face) * 4
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }
  }
  function texRotOf(face) { return face.uvRot ? 1 : 0 }

  for (const m of models) {
    const bits = FLAG_BITS[m.type].reduce((a, f) => a | (1 << f), 0)
    if (m.type === 'player') {
      // 頭・体・腕・脚 (スキン風の色をテクスチャ名で代用 — own-textureパイプライン相当は textureId 0)
      const [px, py, pz] = m.pos
      pushBox(px, py + 1.8, pz, 0.5, 0.5, 0.5, 'white_wool', bits, { skyLight: 1, blockLight: m.blockLight })
      pushBox(px, py + 1.0, pz, 0.5, 0.75, 0.3, 'blue_wool', bits, { skyLight: 1 })
      pushBox(px - 0.4, py + 1.2, pz, 0.25, 0.75, 0.25, 'white_wool', bits, { skyLight: 1 }) // 左腕
      pushBox(px + 0.4, py + 1.2, pz, 0.25, 0.75, 0.25, 'white_wool', bits, { skyLight: 1 }) // 右腕
      pushBox(px - 0.13, py + 0.375, pz, 0.25, 0.75, 0.25, 'darkplank', bits, { skyLight: 1 }) // 左脚
      pushBox(px + 0.13, py + 0.375, pz, 0.25, 0.75, 0.25, 'darkplank', bits, { skyLight: 1 })
    } else if (m.type === 'sword') {
      // エンチャント剣 (剣先が上)
      const [px, py, pz] = m.pos
      pushBox(px, py, pz, 0.12, 1.2, 0.12, 'iron_block', FLAG_BITS.sword.reduce((a, f) => a | (1 << f), 0), { skyLight: 1 })
      pushBox(px, py - 0.75, pz, 0.4, 0.12, 0.12, 'oak_planks', FLAG_BITS.sword.reduce((a, f) => a | (1 << f), 0), { skyLight: 1 })
    } else if (m.type === 'drop') {
      // 回転するドロップアイテム (小ブロック)
      pushBox(m.pos[0], m.pos[1], m.pos[2], 0.3, 0.3, 0.3, 'diamond_block', FLAG_BITS.drop.reduce((a, f) => a | (1 << f), 0), { skyLight: 1 })
    }
  }

  return { vertices: new Float32Array(verts), indices: new Uint32Array(idx) }
}
