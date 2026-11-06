// シーン生成: 手作りバイオーム 7 種 + 手続型 (シード) 地形 + モデル。
// ブロック配置から3プログラム (terrain/liquid/model) のメッシュを生成する。
//
// ブロックの世界: y up、1ブロック=1単位。render position は原点中心に
// なるようブロック座標から offset を引いたもの (renderOffset の役割を再現)。
//
// テクスチャは registry 実在名のみ参照する (bny9u の 911 名)。
// registry に存在しないもの (水・丸太の年輪・プレイヤー) は textures.mjs の
// カスタムタイル (customTexId) を使う。

import { registry, customTexId } from './textures.mjs'

const texId = name => {
  if (name === 'water') return customTexId('water')
  if (name === 'log_top') return customTexId('log_top')
  const e = registry.names.find(n => n.name === name)
  return e ? e.id : 0
}

// カスタム (プレイヤー) タイル id
const CID = {
  skin: customTexId('player_skin'),
  face: customTexId('player_face'),
  hair: customTexId('player_hair'),
  shirt: customTexId('player_shirt'),
  pants: customTexId('player_pants'),
  shoe: customTexId('player_shoe')
}

// フラグビット (BloxdFlags の 14 bool と同じ順)
export const FLAG = {
  OPAQUE: 0, EMISSIVE: 1, VEGETATION: 2, DIRT: 3, SAND: 4, ROCK: 5,
  SLAB: 6, STAIRS: 7, FLAT: 8, PLACED: 9, HELD: 10, DROPPED: 11, THROWN: 12, LIFEFORM: 13
}

// ブロック種別定義: tex面 (top/side/bottom), フラグ, 光, 頂点tint
// colour (tint) は AO と掛けて頂点色に焼き込む。テクスチャの模様は
// bloxdDefaultSurface が bloxdTexel で掛ける (エンジンの texture×tint×AO 相当)。
const BLOCKS = {
  grass: { top: 'grass_top', side: 'grass_block_side', bottom: 'dirt', flags: [FLAG.VEGETATION, FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  dirt: { top: 'dirt', side: 'dirt', bottom: 'dirt', flags: [FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  coarse: { top: 'coarse_dirt', side: 'coarse_dirt', bottom: 'coarse_dirt', flags: [FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  stone: { top: 'stone', side: 'stone', bottom: 'stone', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  mossy: { top: 'mossy_cobblestone', side: 'mossy_cobblestone', bottom: 'mossy_cobblestone', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  stonebrick: { top: 'darkstone_bricks', side: 'darkstone_bricks', bottom: 'darkstone_bricks', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  brick: { top: 'brick', side: 'brick', bottom: 'brick', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  sand: { top: 'sand', side: 'sand', bottom: 'sand', flags: [FLAG.SAND, FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  sandstone: { top: 'sandstone_top', side: 'cut_sandstone', bottom: 'chiseled_sandstone', flags: [FLAG.SAND, FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  bedrock: { top: 'bedrock', side: 'bedrock', bottom: 'bedrock', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  oaklog: { top: 'log_top', side: 'log_maple', bottom: 'log_top', flags: [FLAG.OPAQUE, FLAG.PLACED] },
  oakplank: { top: 'planks_maple', side: 'planks_maple', bottom: 'planks_maple', flags: [FLAG.OPAQUE, FLAG.PLACED] },
  plankwall: { top: 'planks_maple', side: 'planks_maple', bottom: 'planks_maple', flags: [FLAG.OPAQUE, FLAG.PLACED], tint: [1.18, 1.10, 0.94] },
  darkplank: { top: 'planks_cedar', side: 'planks_cedar', bottom: 'planks_cedar', flags: [FLAG.OPAQUE, FLAG.PLACED], tint: [0.62, 0.48, 0.36] },
  leaves: { top: 'leaves_maple', side: 'leaves_maple', bottom: 'leaves_maple', flags: [FLAG.VEGETATION, FLAG.PLACED], tint: [0.85, 0.98, 0.78] },
  spruceleaves: { top: 'leaves_cedar', side: 'leaves_cedar', bottom: 'leaves_cedar', flags: [FLAG.VEGETATION, FLAG.PLACED], tint: [0.64, 0.82, 0.62] },
  water: { top: 'water', side: 'water', bottom: 'water', flags: [FLAG.PLACED], liquid: true },
  lava: { top: 'lava', side: 'lava', bottom: 'lava', flags: [FLAG.EMISSIVE, FLAG.ROCK, FLAG.PLACED], light: [14, 8, 2] },
  glowstone: { top: 'glowstone', side: 'glowstone', bottom: 'glowstone', flags: [FLAG.EMISSIVE, FLAG.OPAQUE, FLAG.PLACED], light: [15, 14, 10] },
  coalore: { top: 'coal_ore', side: 'coal_ore', bottom: 'coal_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  ironore: { top: 'iron_ore', side: 'iron_ore', bottom: 'iron_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  diamondore: { top: 'diamond_ore', side: 'diamond_ore', bottom: 'diamond_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  goldore: { top: 'gold_ore', side: 'gold_ore', bottom: 'gold_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  deepslate: { top: 'darkstone', side: 'darkstone', bottom: 'darkstone', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  gravel: { top: 'gravel', side: 'gravel', bottom: 'gravel', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  cactus: { top: 'cactus_top', side: 'cactus_dry', bottom: 'cactus_top', flags: [FLAG.VEGETATION, FLAG.PLACED] },
  snow: { top: 'snow', side: 'snow', bottom: 'snow', flags: [FLAG.OPAQUE, FLAG.PLACED] },
  ice: { top: 'ice', side: 'ice', bottom: 'ice', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] },
  clay: { top: 'clay', side: 'clay', bottom: 'clay', flags: [FLAG.DIRT, FLAG.OPAQUE, FLAG.PLACED] },
  glass: { top: 'glass', side: 'glass', bottom: 'glass', flags: [FLAG.PLACED] },
  diamond: { top: 'diamond_ore', side: 'diamond_ore', bottom: 'diamond_ore', flags: [FLAG.ROCK, FLAG.OPAQUE, FLAG.PLACED] }
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
  set(x, y, z, type) { if (type) this.blocks.set(key(x, y, z), type); else this.blocks.delete(key(x, y, z)) }
  fill(x0, y0, z0, x1, y1, z1, type) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, type)
  }
  column(x, z, from, to, type) { for (let y = from; y <= to; y++) this.set(x, y, z, type) }
  light(x, y, z, rgb) { this.lights.push({ x, y, z, rgb }) }
  clear(x, y, z) { this.blocks.delete(key(x, y, z)) }

  // 木 (幹4-6 + 葉っぱの塊) — bloxd風のもっくりした樹冠
  tree(x, base, z, h = 4, leaf = 'leaves') {
    for (let i = 0; i < h; i++) this.set(x, base + i, z, 'oaklog')
    for (let dy = -2; dy <= 2; dy++) {
      const r = dy === 2 ? 1 : dy === -2 ? 2 : dy === 0 ? 2 : 2
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < 1) continue
        if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 2 || dy === -2)) continue
        const y = base + h - 1 + dy
        if (!this.blocks.has(key(x + dx, y, z + dz))) this.set(x + dx, y, z + dz, leaf)
      }
    }
  }

  // 松明 (ポール + 光る玉) — モデルとして置く
  torch(x, y, z) {
    this.models.push({ type: 'torch', pos: [x + 0.5, y, z + 0.5] })
    this.light(x + 0.5, y + 0.6, z + 0.5, [14, 14, 12])
  }

  // 小さな家: 板壁 + 丸太柱 + 硝子窓 + 平屋根 + 煙突
  house(x0, y0, z0, w = 7, d = 6, opts = {}) {
    const wall = opts.wall ?? 'plankwall'
    const corner = opts.corner ?? 'oaklog'
    const roof = opts.roof ?? 'darkplank'
    const x1 = x0 + w - 1, z1 = z0 + d - 1
    const h = opts.h ?? 4
    // 床
    this.fill(x0 - 1, y0 - 1, z0 - 1, x1 + 1, y0 - 1, z1 + 1, 'oakplank')
    // 壁 (窓: 中央よりに硝子 1段目-2段目)
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const isEdge = x === x0 || x === x1 || z === z0 || z === z1
      if (!isEdge) continue
      const isCorner = (x === x0 || x === x1) && (z === z0 || z === z1)
      for (let y = y0; y < y0 + h; y++) {
        if (isCorner) { this.set(x, y, z, corner); continue }
        const winRow = y === y0 + 1 || y === y0 + 2
        const winCol =
          (z === z0 || z === z1) ? (x === x0 + 2 || x === x0 + 3 || x === x1 - 1) && x !== x0 && x !== x1
                                 : (z === z0 + 2 || z === z1 - 2) && x > x0 && x < x1
        if (winRow && winCol) this.set(x, y, z, 'glass')
        else this.set(x, y, z, wall)
      }
    }
    // 入口 (南壁の中央を2段ぶん開ける)
    const dx = Math.floor((x0 + x1) / 2)
    this.clear(dx, y0, z1); this.clear(dx, y0 + 1, z1)
    // 屋根 (1段せり出し + 内側に1段)
    this.fill(x0 - 1, y0 + h, z0 - 1, x1 + 1, y0 + h, z1 + 1, roof)
    this.fill(x0 + 1, y0 + h + 1, z0 + 1, x1 - 1, y0 + h + 1, z1 - 1, roof)
    // 煙突
    this.fill(x1 - 1, y0 + h + 1, z0 + 1, x1 - 1, y0 + h + 2, z0 + 1, 'brick')
    // 室内ランプ
    this.set(x0 + 1, y0 + 2, z0 + 1, 'glowstone')
    this.light(x0 + 1.5, y0 + 2.5, z0 + 1.5, [15, 13, 9])
  }

  // 桟橋 (水上の板 + 支柱)
  dock(x0, z0, len, y) {
    for (let i = 0; i < len; i++) {
      const x = x0 + i
      this.set(x, y, z0, 'plankwall')
      this.set(x, y, z0 + 1, 'plankwall')
      if (i % 3 === 0) { this.column(x, y - 2, y - 1, z0, 'oaklog'); this.column(x, y - 2, y - 1, z0 + 1, 'oaklog') }
    }
  }
}

// 高さマップ地形を敷く。surface/dirt/stone を積み、水位以下は水に。
function layTerrain(sb, R, seed, opts = {}) {
  const n1 = seeded2D(seed)
  const n2 = seeded2D(seed * 7919 + 13)
  const amp = opts.amp ?? 3.2
  const base = opts.base ?? 1
  const waterLevel = opts.water ?? -999
  const surface = opts.surface ?? 'grass'
  const subsurface = opts.subsurface ?? 'dirt'
  const rim = opts.rim ?? true
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d = Math.sqrt(x * x + z * z)
    const e = n1(x * 0.09, z * 0.09) * 0.7 + n2(x * 0.24, z * 0.24) * 0.3
    let h = Math.round(base + (e - 0.5) * 2 * amp)
    if (rim && d > R - 12) h += Math.min(6, Math.round((d - (R - 12)) * 0.8)) // 外周を持ち上げ遠景の丘に
    if (waterLevel > -999 && h < waterLevel) h = waterLevel // 水底は平らに
    if (waterLevel > -999 && h <= waterLevel) {
      sb.set(x, h, z, 'clay')
      if (h < waterLevel) sb.column(x, z, h + 1, waterLevel - 1, 'sand')
      sb.set(x, waterLevel, z, 'water')
      sb.column(x, z, -6, h - 1, 'stone')
      sb.set(x, -7, z, 'bedrock')
    } else {
      const beach = waterLevel > -999 && h === waterLevel + 1
      const top = beach ? 'sand' : surface
      sb.set(x, h, z, top)
      sb.column(x, z, h - 3, h - 1, beach ? 'sand' : subsurface)
      if (h - 4 >= -6) sb.column(x, z, -6, h - 4, 'stone')
      sb.set(x, -7, z, 'bedrock')
    }
  }
}

// 指定半径を平地化 (建物の基礎など)。
function flatten(sb, cx, cz, r, h, surface = 'grass', subsurface = 'dirt') {
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    const d = Math.hypot(x - cx, z - cz)
    if (d > r + 0.2) continue
    for (let y = h + 1; y <= h + 10; y++) sb.clear(x, y, z)
    sb.set(x, h, z, surface)
    sb.column(x, z, h - 3, h - 1, subsurface)
    if (h - 4 >= -6) sb.column(x, z, -6, h - 4, 'stone')
    sb.set(x, -7, z, 'bedrock')
  }
}

export function makePlains() {
  const sb = new SceneBuilder()
  const R = 46
  layTerrain(sb, R, 20261106, { amp: 2.6, base: 1, water: -2 })
  // 家 (手前左) — 基礎を平地化してから建てる
  flatten(sb, -6, -3, 8, 1)
  sb.house(-9, 2, -6, 7, 6)
  // 井戸風の小さな石積み
  flatten(sb, 0, -13, 3, 1)
  sb.fill(-1, 2, -14, 1, 2, -12, 'stonebrick')
  sb.set(0, 2, -13, 'water')
  // 木々
  sb.tree(10, h_of(sb, 10, -10) + 1, -10, 5)
  sb.tree(-16, h_of(sb, -16, 8) + 1, 8, 4)
  sb.tree(-6, h_of(sb, -6, 14) + 1, 14, 5)
  sb.tree(16, h_of(sb, 16, 4) + 1, 4, 4)
  sb.tree(8, h_of(sb, 8, 12) + 1, 12, 5)
  sb.tree(-20, h_of(sb, -20, -12) + 1, -12, 4)
  sb.tree(22, h_of(sb, 22, -18) + 1, -18, 5)
  sb.tree(-24, h_of(sb, -24, 2) + 1, 2, 4)
  // ドロップアイテムとプレイヤー (カメラ寄りに置いて存在感を出す)
  sb.models.push({ type: 'drop', pos: [6.5, 3.2, 6.5] })
  const py = h_of(sb, 7, 15) + 1
  sb.models.push({ type: 'player', pos: [7.5, py, 15.5], yaw: 2.8 })
  return { id: 'plains', builder: sb, camera: [10, 12, 22], lookYaw: -0.42, lookPitch: 0.16, camTarget: [0, 2, 0], camDist: 26 }
}

function h_of(sb, x, z) { // 高度補助 (使わないが互換のため残す)
  for (let y = 30; y >= -8; y--) if (sb.blocks.has(key(x, y, z))) return y
  return 0
}

export function makeForest() {
  const sb = new SceneBuilder()
  const R = 46
  layTerrain(sb, R, 777001, { amp: 3.4, base: 1 })
  // 木の配置: 単純 LCG (seeded2D は座標引数が必要なのでここでは使わない)
  let s = 424242
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff }
  for (let i = 0; i < 52; i++) {
    const x = Math.round((rnd() * 2 - 1) * (R - 4))
    const z = Math.round((rnd() * 2 - 1) * (R - 4))
    const d = Math.sqrt(x * x + z * z)
    if (d > R - 6 || d < 5) continue
    sb.tree(x, h_of(sb, x, z) + 1, z, 4 + ((x * 31 + z * 17) % 3), (x + z) % 2 ? 'spruceleaves' : 'leaves')
  }
  const py = h_of(sb, 1, 5) + 1
  sb.models.push({ type: 'player', pos: [1.5, py, 5.5], yaw: 0.5 })
  return { id: 'forest', builder: sb, camera: [6, 11, 20], lookYaw: -0.28, lookPitch: 0.12, camTarget: [0, 3, 0], camDist: 22 }
}

export function makeDesert() {
  const sb = new SceneBuilder()
  const R = 48
  layTerrain(sb, R, 90210, { amp: 2.2, base: 2, surface: 'sand', subsurface: 'sand' })
  // サボテン
  for (const [cx, cz, h] of [[-8, -4, 3], [6, 7, 2], [-14, 9, 3], [11, -10, 2], [3, -15, 3], [-5, 16, 2], [17, 3, 3]]) {
    const g = h_of(sb, cx, cz)
    for (let i = 1; i <= h; i++) sb.set(cx, g + i, cz, 'cactus')
  }
  // 砂岩の遺跡風アーチ
  flatten(sb, 0, -2, 7, 2, 'sand', 'sand')
  sb.fill(-3, 3, -2, 3, 7, -2, 'sandstone')
  for (let y = 3; y <= 6; y++) { sb.clear(-2, y, -2); sb.clear(2, y, -2) }
  sb.fill(-3, 3, -4, -3, 6, -2, 'sandstone')
  sb.fill(3, 3, -4, 3, 6, -2, 'sandstone')
  // 半分埋もれた小ピラミッド
  flatten(sb, 15, 11, 6, 2, 'sand', 'sand')
  sb.fill(12, 3, 8, 18, 3, 14, 'sandstone')
  sb.fill(13, 4, 9, 17, 4, 13, 'sandstone')
  sb.fill(14, 5, 10, 16, 5, 12, 'sandstone')
  sb.models.push({ type: 'player', pos: [0.5, 3, 7.5], yaw: -2.9 })
  return { id: 'desert', builder: sb, camera: [4, 10, 20], lookYaw: -0.18, lookPitch: 0.14, camTarget: [0, 4, 0], camDist: 24 }
}

export function makeWaterside() {
  const sb = new SceneBuilder()
  const R = 46
  // 中央右に淀みない盆地の湖: 中心 (6, 2) からの距離で岸プロファイル
  const n1 = seeded2D(31415)
  const waterLevel = 0
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d = Math.hypot(x - 6, z - 2)
    const e = (n1(x * 0.11, z * 0.11) - 0.5) * 2
    let h
    if (d < 9) h = -3
    else if (d < 12) h = -1
    else if (d < 15) h = 0
    else h = Math.round(1 + e * 2.6)
    const dEdge = Math.hypot(x, z)
    if (dEdge > R - 12) h += Math.min(6, Math.round((dEdge - (R - 12)) * 0.8))
    if (h <= waterLevel) {
      sb.set(x, h, z, 'clay')
      if (h < waterLevel) sb.column(x, z, h + 1, waterLevel - 1, 'sand')
      sb.set(x, waterLevel, z, 'water')
      sb.column(x, z, -6, h - 1, 'stone')
      sb.set(x, -7, z, 'bedrock')
    } else {
      const beach = h === waterLevel + 1
      sb.set(x, h, z, beach ? 'sand' : 'grass')
      sb.column(x, z, h - 3, h - 1, beach ? 'sand' : 'dirt')
      if (h - 4 >= -6) sb.column(x, z, -6, h - 4, 'stone')
      sb.set(x, -7, z, 'bedrock')
    }
  }
  // 岸辺の家 + 桟橋
  flatten(sb, -16, -1, 7, 1)
  sb.house(-19, 2, -4, 7, 6)
  sb.dock(-3, 0, 9, 1)
  sb.tree(-24, h_of(sb, -24, 8) + 1, 8, 5)
  sb.tree(15, h_of(sb, 15, 7) + 1, 7, 4)
  sb.tree(19, h_of(sb, 19, -9) + 1, -9, 5)
  sb.models.push({ type: 'player', pos: [1.5, 2, 1.5], yaw: -1.2 })
  return { id: 'waterside', builder: sb, camera: [14, 9, 15], lookYaw: -0.62, lookPitch: 0.16, camTarget: [-2, 1, 0], camDist: 26 }
}

export function makeRuins() {
  const sb = new SceneBuilder()
  const R = 36
  layTerrain(sb, R, 606060, { amp: 2.2, base: 2 })
  flatten(sb, 0, 0, 9, 2)
  // 中央神殿風: 石レンガの平台 + 柱 (崩れあり)
  sb.fill(-7, 3, -7, 7, 3, 7, 'stonebrick')
  sb.fill(-7, 4, -7, 7, 4, 7, 'mossy')
  const pillars = [[-5, -5], [5, -5], [-5, 5], [5, 5]]
  for (const [px, pz] of pillars) {
    const h = 3 + ((px + pz + 12) % 3)
    for (let i = 5; i < 5 + h; i++) sb.set(px, i, pz, i % 2 ? 'stonebrick' : 'brick')
    if (h >= 4) sb.set(px, 5 + h, pz, 'stonebrick')
  }
  // 崩れた壁
  sb.fill(-7, 5, -7, -4, 6, -7, 'stonebrick'); sb.clear(-5, 6, -7); sb.set(-6, 7, -7, 'brick')
  sb.fill(4, 5, 7, 7, 7, 7, 'mossy')
  // 中央の祭壇 + 光源
  sb.fill(-1, 5, -1, 1, 5, 1, 'stonebrick')
  sb.set(0, 6, 0, 'glowstone')
  sb.light(0, 7, 0, [15, 14, 10])
  sb.torch(-3, 5, 3)
  sb.torch(3, 5, -3)
  // 走り石
  sb.set(9, 3, 3, 'mossy'); sb.set(10, 3, 2, 'mossy'); sb.set(11, 3, 0, 'mossy')
  flatten(sb, 0, 12, 4, 3)
  sb.models.push({ type: 'player', pos: [0, 4, 12], yaw: 3.14 })
  sb.models.push({ type: 'drop', pos: [0, 8.2, 0] })
  return { id: 'ruins', builder: sb, camera: [15, 10, 15], lookYaw: -0.72, lookPitch: 0.24, camTarget: [0, 5, 0], camDist: 26 }
}

export function makeNight() {
  const sb = new SceneBuilder()
  const R = 40
  layTerrain(sb, R, 131313, { amp: 2.6, base: 1 })
  flatten(sb, -5, -5, 7, 1)
  sb.house(-8, 2, -8, 7, 6)
  // 中景にもう一軒 (村っぽく)
  flatten(sb, 14, 2, 6, 1)
  sb.house(12, 2, 0, 6, 5, { h: 3 })
  sb.tree(12, h_of(sb, 12, -6) + 1, -6, 5)
  sb.tree(-4, h_of(sb, -4, 12) + 1, 12, 4)
  sb.tree(-18, h_of(sb, -18, 6) + 1, 6, 5)
  // 道なりに松明
  for (const [tx, tz] of [[-2, 6], [2, 2], [6, -2], [10, -6]]) sb.torch(tx, h_of(sb, tx, tz) + 1, tz)
  const py = h_of(sb, -2, 7) + 1
  sb.models.push({ type: 'player', pos: [-2, py, 7], yaw: 0.9 })
  sb.sky.night = true
  return { id: 'night', builder: sb, camera: [8, 9, 18], lookYaw: 2.6, lookPitch: 0.10, camTarget: [2, 3, 0], camDist: 24 }
}

export function makeCave() {
  const sb = new SceneBuilder()
  const R = 18
  // 洞窟: y -7床 の空洞を石で囲む
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const ceil = 4 + Math.round(2 * Math.sin(x * 0.3 + z * 0.21))
    for (let y = -8; y <= ceil; y++) {
      const d = Math.sqrt(x * x + z * z)
      const inCave = y >= -6 && y < ceil - 1 && d < R - 2
      if (!inCave) sb.set(x, y, z, y < -6 ? 'bedrock' : 'stone')
    }
  }
  // 溶岩プール (床に沿って)
  sb.fill(-6, -6, -4, 6, -6, 4, 'lava'); sb.light(0, -5, 0, [14, 8, 2])
  sb.set(-16, -6, 0, 'glowstone'); sb.light(-15.5, -5, 0, [15, 14, 10])
  // 鉱石脈 (壁面 d≥16 に埋める — 空洞内に浮かせない)
  for (const [x, y, z, t] of [[-15, -4, -6, 'coalore'], [15, -3, 7, 'ironore'], [-6, -4, 15, 'diamondore'], [7, -5, -15, 'goldore'], [-13, -2, 10, 'coalore'], [10, -4, -13, 'ironore']]) sb.set(x, y, z, t)
  sb.fill(-2, -6, 2, 2, -6, 2, 'gravel')
  sb.torch(4, -6, 8)
  sb.torch(-4, -6, -8)
  sb.torch(-10, -6, 4)
  sb.torch(10, -6, -4)
  sb.torch(0, -6, -12)
  sb.torch(-8, -6, -11)
  sb.torch(8, -6, 11)
  sb.models.push({ type: 'player', pos: [5, -6, 9], yaw: 2.6 })
  return { id: 'cave', builder: sb, camera: [0, -4, 12], lookYaw: 0, lookPitch: 0.10, camTarget: [0, -5.5, 0], camDist: 13 }
}

// ---- 手続型 (シード) ----
function seeded2D(seed) {
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
  const R = 48
  const n1 = seeded2D(seed)
  const n2 = seeded2D(seed * 7919 + 13)
  const waterLevel = 0
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const e = n1(x * 0.09, z * 0.09) * 0.7 + n2(x * 0.28, z * 0.28) * 0.3
    let h = Math.round(e * 11 - 4)
    const d = Math.sqrt(x * x + z * z)
    if (d > R - 12) h += Math.min(6, Math.round((d - (R - 12)) * 0.8)) // 外周を持ち上げ遠景の丘に
    if (h <= waterLevel) {
      sb.set(x, h, z, 'clay')
      if (h < waterLevel) sb.column(x, z, h + 1, waterLevel - 1, 'sand')
      sb.set(x, waterLevel, z, 'water')
      sb.column(x, z, -6, h - 1, 'stone')
      sb.set(x, -7, z, 'bedrock')
    } else {
      const beach = h === waterLevel + 1
      sb.set(x, h, z, beach ? 'sand' : 'grass')
      sb.column(x, z, h - 3, h - 1, beach ? 'sand' : 'dirt')
      if (h - 4 >= -6) sb.column(x, z, -6, h - 4, 'stone')
      sb.set(x, -7, z, 'bedrock')
      if (!beach && h > waterLevel + 1 && d < R - 6 && x % 5 === 0 && z % 5 === 0 && n2(x * 0.5, z * 0.5) > 0.70) {
        sb.tree(x, h + 1, z, 4 + Math.floor(n1(x, z) * 3))
      }
      if (h > 7 && n2(x * 1.3 + 40, z * 1.3) > 0.78) sb.set(x, h, z, 'stone') // 山肌の岩
    }
  }
  sb.models.push({ type: 'player', pos: [6, h_of(sb, 6, 10) + 1, 10], yaw: -0.6 })
  return { id: 'procedural', builder: sb, camera: [18, 14, 18], lookYaw: -0.8, lookPitch: 0.30, camTarget: [0, 4, 0], camDist: 22, seed }
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
    if (d > 16) continue
    r = Math.max(r, Math.max(0, L.rgb[0] * (1 - d / 16)) / 15)
    g = Math.max(g, Math.max(0, L.rgb[1] * (1 - d / 16)) / 15)
    b = Math.max(b, Math.max(0, L.rgb[2] * (1 - d / 16)) / 15)
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

// AO: 頂点周囲の固体数 → 0.62..1 (面の軸に応じて接面方向のみ調査)
function vertexAO(sx, sy, sz, corner, solidAt) {
  const cx = corner[0] === 1 ? 1 : -1
  const cy = corner[1] === 1 ? 1 : -1
  const cz = corner[2] === 1 ? 1 : -1
  let occ = 0
  if (sx) { // x面: y,z 近傍
    occ += solidAt(0, cy, 0) + solidAt(0, 0, cz) + solidAt(0, cy, cz)
  } else if (sy) { // y面: x,z 近傍
    occ += solidAt(cx, 0, 0) + solidAt(0, 0, cz) + solidAt(cx, 0, cz)
  } else { // z面: x,y 近傍
    occ += solidAt(cx, 0, 0) + solidAt(0, cy, 0) + solidAt(cx, cy, 0)
  }
  if (occ === 3) return 0.55
  return [1.0, 0.86, 0.74, 0.62][Math.min(occ, 3)]
}

// シーン → 3プログラムの頂点バッファ。
// 頂点レイアウト (エンジンの mesher 相当、32B+4B → ここでは 1 バッファ 84B):
//   position f32×3 | normal f32×3 | colour u8×4 (unorm) | uv f32×2 |
//   atlasIndex f32 | textureId u32 | textureRotation u32 | mipLevel f32 |
//   flags u32 (bitpack) | lightLevels u32 (nibble pack) | localPosition f32×3
// colour は tint×AO (テクスチャの平均色は含めない — 模様は
// bloxdDefaultSurface の bloxdTexel が掛けて texture×tint×AO を再現する)。
export function buildMeshes(scene) {
  const sb = scene.builder
  const blocks = sb.blocks
  let maxY = 0
  for (const k of blocks.keys()) { const y = Number(k.split(',')[1]); if (y > maxY) maxY = y }

  const solidAt = (x, y, z) => {
    const t = blocks.get(key(x, y, z))
    return t && BLOCKS[t]?.flags.includes(FLAG.OPAQUE) ? 1 : 0
  }

  // mip 近似: 既定視点からの距離で 0..3
  const eye = scene.camera ?? [0, 10, 20]
  const mipAt = (x, y, z) => {
    const d = Math.hypot(x - eye[0], y - eye[1], z - eye[2])
    return Math.max(0, Math.min(3, Math.round(Math.log2(Math.max(1, d / 11)))))
  }

  const buffers = { terrain: [], liquid: [], model: [] }
  const indices = { terrain: [], liquid: [], model: [] }

  for (const [k, type] of blocks) {
    const [x, y, z] = k.split(',').map(Number)
    const def = BLOCKS[type]
    if (!def) continue
    const program = def.liquid ? 'liquid' : 'terrain'
    const flagsBits = def.flags.reduce((acc, f) => acc | (1 << f), 0)
    const emissive = def.flags.includes(FLAG.EMISSIVE)
    const tint = def.tint ?? [1, 1, 1]

    for (const face of FACES) {
      const [dx, dy, dz] = face.dir
      const nx = x + dx, ny = y + dy, nz = z + dz
      const neighbor = blocks.get(key(nx, ny, nz))
      // 露出判定: 隣が不透明固体なら描かない (水の隣の水も描かない)
      if (neighbor && BLOCKS[neighbor]?.flags.includes(FLAG.OPAQUE)) continue
      if (program === 'liquid' && neighbor === 'water') continue
      // 世界の底の bedrock 下面は絶対に見えない
      if (type === 'bedrock' && dy === -1) continue

      const texName = dy === 1 ? def.top : dy === -1 ? def.bottom : def.side
      const id = texId(texName)
      const layer = id - 1
      const texRot = 0

      // 面中心の光
      const lightRGB = emissive ? [1, 1, 1] : lightAt(sb.lights, x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5, z + 0.5 + dz * 0.5)
      const sky = emissive ? 15 : skyLightAt(blocks, x, y, z, maxY)

      const base = buffers[program].length / 21
      for (let ci = 0; ci < 4; ci++) {
        const c = face.corners[ci]
        const ao = def.flags.includes(FLAG.OPAQUE) || program === 'liquid'
          ? vertexAO(dx, dy, dz, c, (ox, oy, oz) => solidAt(x + dx + ox, y + dy + oy, z + dz + oz))
          : 1
        const aoF = program === 'liquid' ? Math.max(ao, 0.9) : ao
        const mip = mipAt(x + c[0], y + c[1], z + c[2])
        const v = [
          x + c[0], y + c[1], z + c[2],
          dx, dy, dz,
          Math.round(255 * aoF * tint[0]), Math.round(255 * aoF * tint[1]), Math.round(255 * aoF * tint[2]), 255, // colour u8n
          FACE_UVS[ci][0], FACE_UVS[ci][1],
          layer, // atlasIndex (f32)
          id, texRot, mip, // textureId, rotation, mip
          flagsBits,
          (Math.round(lightRGB[0] * 15) << 24 | Math.round(lightRGB[1] * 15) << 20 |
           Math.round(lightRGB[2] * 15) << 16 | sky << 12) >>> 0,
          0, 0, 0 // localPosition (terrain/liquidは 0)
        ]
        buffers[program].push(...v)
      }
      indices[program].push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }

  // モデルメッシュ (プレイヤー・松明・ドロップ)
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

// モデル: bloxd アバター (頭/体/腕/脚)・松明・ドロップアイテム。
// 頂点属性は terrain と同じ 21 float。テクスチャは面ごとに指定可能
// (文字列=全 面、{px,nx,py,ny,pz,nz}=面ごと)。
function buildModelMeshes(models) {
  const verts = []
  const idx = []
  const FLAG_BITS = {
    player: [FLAG.LIFEFORM, FLAG.PLACED],
    torch: [FLAG.EMISSIVE],
    drop: [FLAG.DROPPED]
  }

  const FACE_KEY = ['px', 'nx', 'py', 'ny', 'pz', 'nz']

  function pushBox(cx, cy, cz, sx, sy, sz, tex, flagsBits, extra = {}) {
    const base = verts.length / 21
    for (let fi = 0; fi < FACES.length; fi++) {
      const face = FACES[fi]
      const [dx, dy, dz] = face.dir
      const texVal = typeof tex === 'number'
        ? tex
        : typeof tex === 'string'
          ? tex
          : (tex[FACE_KEY[fi]] ?? tex.px ?? 'stone')
      const id = typeof texVal === 'number' ? texVal : texId(texVal)
      const layer = id - 1
      const lightSky = extra.skyLight ?? 15
      for (let ci = 0; ci < 4; ci++) {
        const c = face.corners[ci]
        verts.push(
          cx + (c[0] - 0.5) * sx, cy + (c[1] - 0.5) * sy, cz + (c[2] - 0.5) * sz,
          dx, dy, dz,
          255, 255, 255, 255, // tint 1 (テクスチャが色を持つ)
          FACE_UVS[ci][0], FACE_UVS[ci][1],
          layer, id, face.uvRot ? 1 : 0, 0.0,
          flagsBits,
          (Math.round((extra.blockLight?.[0] ?? 0) * 15) << 24 | Math.round((extra.blockLight?.[1] ?? 0) * 15) << 20 |
           Math.round((extra.blockLight?.[2] ?? 0) * 15) << 16 | lightSky << 12) >>> 0,
          // localPosition: モデル原点 (モデル中心) からのオフセット
          (c[0] - 0.5) * sx, (c[1] - 0.5) * sy, (c[2] - 0.5) * sz
        )
      }
      const b = base + fi * 4
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }
  }

  for (const m of models) {
    const bits = FLAG_BITS[m.type].reduce((a, f) => a | (1 << f), 0)
    if (m.type === 'player') {
      // bloxd 風アバター (頭=顔/髪/肌、体=シャツ、腕=肌、脚=ズボン+靴)
      const [px, py, pz] = m.pos
      const yaw = m.yaw ?? 0
      const cs = Math.cos(yaw), sn = Math.sin(yaw)
      const R2 = (lx, lz) => [px + lx * cs - lz * sn, pz + lx * sn + lz * cs] // 回転付きローカル→ワールド
      const head = 0.5
      // 頭 (中心 y+1.55): 前面だけ顔、上面は髪、他は肌
      const [hx, hz] = R2(0, 0)
      pushBox(hx, py + 1.55, hz, head, head, head,
        { px: CID.skin, nx: CID.skin, py: CID.hair, ny: CID.skin, pz: CID.skin, nz: CID.face }, bits, { skyLight: 15 })
      // 体 (y+0.95): 0.5x0.75x0.3
      const [bx2, bz2] = R2(0, 0)
      pushBox(bx2, py + 0.95, bz2, 0.5, 0.75, 0.3, CID.shirt, bits, { skyLight: 15 })
      // 腕 (両脇): 肌
      const [lax, laz] = R2(-0.375, 0)
      pushBox(lax, py + 1.0, laz, 0.25, 0.75, 0.25, CID.skin, bits, { skyLight: 15 })
      const [rax, raz] = R2(0.375, 0)
      pushBox(rax, py + 1.0, raz, 0.25, 0.75, 0.25, CID.skin, bits, { skyLight: 15 })
      // 脚 (2本): ズボン + 下端に靴
      const [llx, llz] = R2(-0.125, 0)
      pushBox(llx, py + 0.375, llz, 0.25, 0.6, 0.25, CID.pants, bits, { skyLight: 15 })
      pushBox(llx, py + 0.07, llz, 0.27, 0.14, 0.29, CID.shoe, bits, { skyLight: 15 })
      const [rlx, rlz] = R2(0.125, 0)
      pushBox(rlx, py + 0.375, rlz, 0.25, 0.6, 0.25, CID.pants, bits, { skyLight: 15 })
      pushBox(rlx, py + 0.07, rlz, 0.27, 0.14, 0.29, CID.shoe, bits, { skyLight: 15 })
    } else if (m.type === 'torch') {
      // 松明: 細い支柱 + 光る先端
      const [px, py, pz] = m.pos
      pushBox(px, py + 0.3, pz, 0.12, 0.6, 0.12, 'oaklog', bits, { skyLight: 12 })
      pushBox(px, py + 0.68, pz, 0.18, 0.18, 0.18, 'glowstone', FLAG_BITS.torch.reduce((a, f) => a | (1 << f), 0), { skyLight: 15, blockLight: [1, 1, 1] })
    } else if (m.type === 'drop') {
      // 回転するドロップアイテム (小ブロック)
      pushBox(m.pos[0], m.pos[1], m.pos[2], 0.3, 0.3, 0.3, 'diamond', FLAG_BITS.drop.reduce((a, f) => a | (1 << f), 0), { skyLight: 15 })
    }
  }

  return { vertices: new Float32Array(verts), indices: new Uint32Array(idx) }
}
