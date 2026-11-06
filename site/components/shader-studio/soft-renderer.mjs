// Shader Studio ソフトウェアレンダラー — WebGPU/WebGL が無い環境向けの
// CPU プレビュー。StudioRenderer と同じ公開インターフェース
// (init/setPack/setStrict/setScene/start/stop/render/resize/destroy,
//  params/camera/onStatus) を持ち、app.jsx は GPU 初期化失敗時に本クラスへ
// フォールバックする。
//
// 構成:
//   - WGSL→JS トランスパイラ (wgsl-js.mjs) でエンジンヘッダ + パックコードを
//     JS 関数化し、shader-gen.mjs と同じ 6 バリアント (strict|allow ×
//     terrain|liquid|model) のマクロ行列でプリプロセスする
//   - buildSurfaceIn / buildLightIn / fsMain / vsMain は shader-gen.mjs の
//     「studio runtime」テンプレートを JS にミラーしたもの (同一式)
//   - skybox は renderer.mjs の SKYBOX_WGSL を JS 移植
//   - アトラス・シーン・ミップは textures.mjs / scenes.mjs の生成物を再利用
//   - 描画は低解像度 (適応的) で Canvas2D ImageData にソフトラスタライズし、
//     drawImage で拡大表示
//
// 既知の近似 (WebGPU パスとの差):
//   - 導関数 (dpdx/dpdy/fwidth) は 0 を返す (uses.derivatives で通知)
//   - ポインタ (ptr/&/*) はトランスパイルエラーになる
//   - GPU コンパイラ相当の型検査はない (静的 validator + 構文検査のみ)

import { transpileWgsl, evalWgslModule } from './wgsl-js.mjs'
import { preprocessWgsl } from './preprocess.mjs'
import { makeVariantMacros, detectHooks, makeTextureIdConstants, FRAGMENT_BLOCK_POSITION_WGSL } from './shader-gen.mjs'
import ENGINE_HEADER from './engine-header.mjs'
import { buildMeshes, SCENES } from './scenes.mjs'
import { buildAtlasPixels, buildMips, animLadderInfo, ATLAS_TILE, ATLAS_LAYERS } from './textures.mjs'
import { mat4Perspective, mat4View, mat4Mul, mat4InvViewNoTrans } from './renderer.mjs'

const VERT_FLOATS = 21      // scenes.mjs の 1 頂点 21 float
const VOUT_STRIDE = 20      // clip(4) + pos(3) + nrm(3) + col(4) + uv(2) + mip(1) + lp(3)
const W_EPS = 1e-4

const sat = x => x < 0 ? 0 : x > 1 ? 1 : x
const mixN = (a, b, t) => a + (b - a) * t
const smoothstep = (lo, hi, x) => { const t = sat((x - lo) / (hi - lo)); return t * t * (3 - 2 * t) }
const FLAG_NAMES = ['opaque', 'emissive', 'vegetation', 'dirt', 'sand', 'rock', 'slab', 'stairs', 'flat', 'placed', 'held', 'dropped', 'thrown', 'lifeform']

function makeOffscreen(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    return c
  }
  return null
}

// ------------------------------------------------------------ fast path --
// エンジンヘッダー (engine-header.mjs) の重い関数の高速実装。式は逐語同一:
//   bloxdShading      = saturate(directional*diffuse + emissive + ambient)
//   bloxdWorldLight   = max(block, sky, held)、block/held = a + l*(1-a)、
//                       sky = mix(a, skyLightColour, skyLight)
//   bloxdLitColour    = mix(shading*overlaid, enchant, a_e) * worldLight を max(·,0)
//   bloxdDefaultLight = fog(litColour + emission)
//   bloxdDefaultSurface = 構造体コピー (alpha はバリアント依存)
// 差分検証: test_soft_renderer.mjs §9 (トランスパイル版と乱数入力で比較)。
const _sat1 = x => x < 0 ? 0 : x > 1 ? 1 : x

function makeFastHeaderFns() {
  const shadingScalar = light => {
    const d = light.directional
    return [
      _sat1(d * light.diffuse[0] + light.emissive[0] + light.ambient[0]),
      _sat1(d * light.diffuse[1] + light.emissive[1] + light.ambient[1]),
      _sat1(d * light.diffuse[2] + light.emissive[2] + light.ambient[2])
    ]
  }
  const worldLightScalar = light => {
    const a = light.ambientLightColour, bl = light.blockLight, sk = light.skyLightColour, hd = light.heldLight, t = light.skyLight
    return [
      Math.max(a[0] + bl[0] * (1 - a[0]), a[0] + (sk[0] - a[0]) * t, a[0] + hd[0] * (1 - a[0])),
      Math.max(a[1] + bl[1] * (1 - a[1]), a[1] + (sk[1] - a[1]) * t, a[1] + hd[1] * (1 - a[1])),
      Math.max(a[2] + bl[2] * (1 - a[2]), a[2] + (sk[2] - a[2]) * t, a[2] + hd[2] * (1 - a[2]))
    ]
  }
  const litScalars = (surface, light) => {
    let r = surface.colour[0], g = surface.colour[1], b = surface.colour[2]
    const ov = surface.overlayColour
    if (ov[3] !== 0) {
      r += (ov[0] - r) * ov[3]; g += (ov[1] - g) * ov[3]; b += (ov[2] - b) * ov[3]
    }
    const sh = shadingScalar(light)
    r *= sh[0]; g *= sh[1]; b *= sh[2]
    const en = surface.enchantColour
    if (en[3] !== 0) {
      r += (en[0] - r) * en[3]; g += (en[1] - g) * en[3]; b += (en[2] - b) * en[3]
    }
    const wl = worldLightScalar(light)
    return [Math.max(r * wl[0], 0), Math.max(g * wl[1], 0), Math.max(b * wl[2], 0)]
  }
  return {
    bloxdShading: shadingScalar,
    bloxdWorldLight: worldLightScalar,
    bloxdLitColour: (surface, light) => litScalars(surface, light),
    bloxdApplyFog: (colour, light) => {
      const f = light.fogAlpha, fc = light.fogColour
      return [colour[0] + (fc[0] - colour[0]) * f, colour[1] + (fc[1] - colour[1]) * f, colour[2] + (fc[2] - colour[2]) * f]
    },
    bloxdDefaultLight: (surface, light) => {
      const l = litScalars(surface, light)
      const em = surface.emission
      const r = l[0] + em[0], g = l[1] + em[1], b = l[2] + em[2]
      const f = light.fogAlpha, fc = light.fogColour
      return { colour: [r + (fc[0] - r) * f, g + (fc[1] - g) * f, b + (fc[2] - b) * f] }
    }
  }
}

// bloxdDefaultSurface はバリアント (BLOXD_ALPHA) でフィールドが変わるため別生成。
// スタジオ仕様: colour (tint×AO) × bloxdTexel のテクスチャ — GPU 側の
// engine-header.mjs と同じ式。レンダラーの _bloxdTexel に結び付けるため
// クラスメソッド側でファクトリを生成する。

export class StudioSoftRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.onStatus = opts.onStatus || (() => {})
    this.soft = true
    this.ready = false
    this.sceneId = 'plains'
    this.strict = false
    this.userCode = ''
    this.programs = null
    this.hookInfo = null
    this.compileErrors = []
    this.params = {
      sunAzimuth: 215, sunElevation: 54,
      fogDistance: 1, lit: true, paused: false,
      ambient: 0.45, diffuse: 0.95,
      heldLight: 0, enchantTier: 3,
      overlayOn: false
    }
    this.camera = { yaw: -0.15, pitch: 0.35, dist: 24, target: [0, 3, 0] }
    this.startSeconds = performance.now() / 1000
    this._raf = null
    this._dirty = true
    this._lastDrawMs = 0
    this._lastAnimBucket = -1
    this._pendingSceneExtra = {}
    this._resLadder = [[480, 300], [384, 240], [320, 200], [256, 160]]
    this._resIdx = 2 // CPU パスは初期から控えめに (遅い環境向けフォールバックのため)
    this._emaMs = null
    this._framesDrawn = 0
    this._fragErrors = 0
    this._animates = false
    // uniform の JS ミラー
    this.packInputs = { seconds: 0, lit: 1, renderOffset: [0, 0, 0], sunDirection: [0, 0, 0], eyePosition: [0, 0, 0] }
    this.view = {
      eye: [0, 0, 0], nearFarViewport: [0.1, 400, 1, 1], sunDirection: [0, 0, 0],
      ambient: [0, 0, 0], diffuse: [0, 0, 0], ambientLightColour: [0, 0, 0],
      skyLightColour: [0, 0, 0], heldLight: [0, 0, 0], fogParams: [0, 0],
      fogColour: [183 / 255, 191 / 255, 195 / 255], enchantRGB: [0.62, 0.42, 1.0, 1.4],
      enchantTierOverlay: [0, 0], overlay: [0.85, 0.12, 0.10, 0.35]
    }
    this._zero3 = [0, 0, 0]
    this._zero4 = [0, 0, 0, 0]
    this._flagsCache = new Map()
    // 現在フラグメント情報 (bloxdTexel / bloxdOpaqueBehind が読む)
    this._fragRot = 0
    this._fragPos = this._zero3
    this._fragScreenUV = [0, 0]
    this._fragDepth = 0
    this._outRGBA = [0, 0, 0, 0]
    // トランスパイル済みコードへ渡す環境 (this 束縛済み)
    this._wgslEnv = {
      bloxdPackInputs: this.packInputs,
      bloxdTexel: (id, uv, mip) => this._bloxdTexel(id, uv, mip),
      bloxdTextureSize: mip => this._bloxdTextureSize(mip),
      bloxdOpaqueBehind: () => this._bloxdOpaqueBehind()
    }
    // エンジンヘッダーの重い関数の高速 JS 実装 (同一式 — 差分テストで検証)。
    // トランスパイル版は毎フラグメント ~20 の中間配列を割り当てるため、
    // externals バインドで差し替えて割り当てを削減する。
    // (bloxdDefaultSurface は BLOXD_ALPHA バリアントでフィールドが変わるため
    //  _recompile 側で都度差し替える)
    this._fastFns = makeFastHeaderFns()
    for (const k of Object.keys(this._fastFns)) this._wgslEnv[k] = this._fastFns[k]
  }

  async init() {
    this.ctx = this.canvas.getContext && this.canvas.getContext('2d')
    if (!this.ctx) throw new Error('Canvas 2D unavailable (CPU preview)')
    // アトラス (WebGPU パスと同じ生成物)
    this.mips = buildMips(buildAtlasPixels())
    this.animLadders = animLadderInfo()
    this.layers = new Uint32Array(ATLAS_LAYERS + 1)
    for (let id = 0; id <= ATLAS_LAYERS; id++) this.layers[id] = Math.max(0, id - 1)
    this._applyRes()
    this.setScene(this.sceneId, this._pendingSceneExtra || {})
    this.ready = true
    this._recompile()
  }

  // ------------------------------------------------------------ scene ----
  setScene(sceneId, extra = {}) {
    this.sceneId = sceneId
    this._pendingSceneExtra = extra
    if (!this.ctx) return false
    const maker = SCENES[sceneId]
    if (!maker) return false
    this.scene = maker(extra.seed)
    this.meshes = buildMeshes(this.scene)
    // エンチャント光は held モデル (剣) がある時のみ毎フレーム変化する
    this._hasHeldModel = !!(this.scene.builder && this.scene.builder.models || []).some(m => m.type === 'sword')
    this.camera.yaw = this.scene.lookYaw ?? 0
    this.camera.pitch = this.scene.lookPitch ?? 0.3
    const c = this.scene.camera
    this.camera.dist = this.scene.camDist ?? (c ? Math.hypot(c[0], c[1], c[2]) * 0.55 : 24)
    this.camera.target = this.scene.camTarget ?? [0, this.sceneId === 'cave' ? -3 : 3, 0]
    if (sceneId === 'night') this.params.sunElevation = -12
    else if (this.params.sunElevation < 0) this.params.sunElevation = 54
    this._dirty = true
    return true
  }

  // ------------------------------------------------------------ pack -----
  setPack(code) {
    this.userCode = code
    if (this.ready) this._recompile()
    this._dirty = true
  }

  setStrict(strict) {
    this.strict = strict
    if (this.ready) this._recompile()
    this._dirty = true
  }

  _recompile() {
    this.compileErrors = []
    this.hookInfo = {}
    this.programs = {}
    this._fragErrors = 0
    this._animates = false
    const notices = []
    const texIds = makeTextureIdConstants()
    const prelude = texIds + '\n' + FRAGMENT_BLOCK_POSITION_WGSL
    const preludeLines = prelude.split('\n').length

    const usesSecondsRe = /\bbloxdSeconds\s*\(|\bbloxdTexel\s*\(|\bbloxdOpaqueBehind\s*\(/
    let anyUses = false
    let anyDerivatives = false

    for (const program of ['terrain', 'liquid', 'model']) {
      const macros = makeVariantMacros(program, this.strict)
      const header = preprocessWgsl(ENGINE_HEADER, macros)
      const user = preprocessWgsl(this.userCode, macros)
      if (header.errors.length || user.errors.length) {
        this.compileErrors.push(...header.errors.map(e => ({ program, ...e })))
        this.compileErrors.push(...user.errors.map(e => ({ program, ...e })))
        this.programs[program] = null
        continue
      }
      const has = detectHooks(user.code, program)
      const source = prelude + '\n' + header.code + '\n' + user.code
      const userOffset = preludeLines + header.code.split('\n').length
      // bloxdDefaultSurface はバリアント依存 (BLOXD_ALPHA) — env を都度更新
      this._wgslEnv.bloxdDefaultSurface = this._makeDefaultSurface(program === 'liquid' || !this.strict)
      const externals = ['bloxdPackInputs', 'bloxdTexel', 'bloxdTextureSize',
        'bloxdDefaultSurface', 'bloxdLitColour', 'bloxdDefaultLight',
        'bloxdApplyFog', 'bloxdShading', 'bloxdWorldLight']
      if (program === 'liquid') externals.push('bloxdOpaqueBehind')
      const t = transpileWgsl(source, { externals })
      if (!t.js || t.errors.length) {
        for (const e of t.errors) {
          const line = e.line && e.line > userOffset ? e.line - userOffset : e.line
          this.compileErrors.push({ program, line, message: e.message, wgsl: true })
        }
        this.programs[program] = null
        continue
      }
      const env = {}
      for (const name of externals) env[name] = this._wgslEnv[name]
      let M
      try {
        M = evalWgslModule(t.js, env)
      } catch (e) {
        this.compileErrors.push({ program, message: String(e && e.message || e).slice(0, 400), wgsl: true })
        this.programs[program] = null
        continue
      }
      if (usesSecondsRe.test(user.code)) anyUses = true
      if (t.uses && t.uses.derivatives) anyDerivatives = true
      this.programs[program] = this._makeProgram(program, M, has)
      this.hookInfo[program] = has
    }
    this._animates = anyUses
    if (anyDerivatives) {
      notices.push('CPU preview: derivatives (dpdx/dpdy/fwidth) are approximated as 0.')
    }
    this.onStatus({ type: 'compiled', errors: this.compileErrors, hooks: this.hookInfo, notices })
    if (this.compileErrors.length) {
      this.onStatus({ type: 'wgsl-errors', errors: this.compileErrors })
    }
    this._dirty = true
  }

  _makeProgram(program, M, has) {
    const cap = program === 'terrain' ? 'Terrain' : program === 'liquid' ? 'Liquid' : 'Model'
    const F = {
      vPosition: [0, 0, 0], vNormal: [0, 1, 0], vColour: [1, 1, 1, 1], vUv: [0, 0],
      vTextureId: 0, vTextureRotation: 0, vMipLevel: 0, vFlagsBits: 0, vLightLevels: 0,
      vLocalPosition: [0, 0, 0]
    }
    const S = {
      colour: [0, 0, 0], alpha: 1, enchantTier: 0, enchantColour: this._zero4,
      enchantSpeed: 0, overlayColour: this._zero4,
      position: F.vPosition, normal: F.vNormal, localPosition: F.vLocalPosition,
      flags: {}, textureId: 0, textureRotation: 0, uv: F.vUv, mipLevel: 0
    }
    const L = {
      litColour: [0, 0, 0], directional: 0, diffuse: [0, 0, 0], emissive: [0, 0, 0],
      ambient: [0, 0, 0], blockLight: [0, 0, 0], skyLight: 0,
      ambientLightColour: [0, 0, 0], skyLightColour: [0, 0, 0], heldLight: [0, 0, 0],
      fogColour: [0, 0, 0], fogAlpha: 0,
      position: F.vPosition, normal: F.vNormal, localPosition: F.vLocalPosition,
      flags: {}, textureId: 0, textureRotation: 0, uv: F.vUv, mipLevel: 0
    }
    const L2 = Object.assign({}, L)
    L2._keys = Object.keys(L)
    return {
      program, M, has,
      isLiquid: program === 'liquid',
      isModel: program === 'model',
      hookVertex: (has.vertex && !this.strict) ? M['bloxd' + cap + 'Vertex'] : null,
      hookSurface: has.surface ? M['bloxd' + cap + 'Surface'] : null,
      hookLight: has.light ? M['bloxd' + cap + 'Light'] : null,
      F, S, L, L2,
      vout: null,
      broken: false
    }
  }

  // ---------------------------------------------------- texture API ------
  // bloxdDefaultSurface (スタジオ式: tint×AO × texel)。GPU 側 engine-header.mjs
  // の bloxdDefaultSurface と同じ意味。
  _makeDefaultSurface(withAlpha) {
    const texel = this._bloxdTexel.bind(this)
    if (withAlpha) {
      return s => {
        const t = texel(s.textureId, s.uv, s.mipLevel)
        return {
          colour: [s.colour[0] * t[0], s.colour[1] * t[1], s.colour[2] * t[2]],
          alpha: s.alpha * t[3],
          emission: [0, 0, 0],
          enchantColour: [s.enchantColour[0], s.enchantColour[1], s.enchantColour[2], s.enchantColour[3]],
          overlayColour: [s.overlayColour[0], s.overlayColour[1], s.overlayColour[2], s.overlayColour[3]]
        }
      }
    }
    return s => {
      const t = texel(s.textureId, s.uv, s.mipLevel)
      return {
        colour: [s.colour[0] * t[0], s.colour[1] * t[1], s.colour[2] * t[2]],
        emission: [0, 0, 0],
        enchantColour: [s.enchantColour[0], s.enchantColour[1], s.enchantColour[2], s.enchantColour[3]],
        overlayColour: [s.overlayColour[0], s.overlayColour[1], s.overlayColour[2], s.overlayColour[3]]
      }
    }
  }

  _bloxdTexel(textureId, uv, mipLevel) {
    const rot = this._fragRot | 0
    let ux = uv[0], uy = uv[1]
    if (rot === 1) { const t = ux; ux = uy; uy = 1 - t }
    else if (rot === 2) { ux = 1 - ux; uy = 1 - uy }
    else if (rot === 3) { const t = 1 - uy; uy = ux; ux = t }
    if (textureId === 0 || textureId >= ATLAS_LAYERS + 1) return [1, 1, 1, 1]
    const layer = this.layers[textureId | 0] | 0
    const level = Math.min(3, Math.max(0, Math.round(mipLevel)))
    const size = ATLAS_TILE >> level
    let px = Math.floor(ux * size); px = ((px % size) + size) % size
    let py = Math.floor(uy * size); py = ((py % size) + size) % size
    const d = this.mips[level]
    const i = (layer * size * size + py * size + px) * 4
    return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, d[i + 3] / 255]
  }

  _bloxdTextureSize(mipLevel) {
    const level = Math.min(3, Math.max(0, Math.round(mipLevel)))
    const size = ATLAS_TILE >> level
    return [size, size]
  }

  _bloxdOpaqueBehind() {
    const W = this.resW, H = this.resH
    let px = Math.floor(this._fragScreenUV[0] * W)
    let py = Math.floor(this._fragScreenUV[1] * H)
    px = Math.min(W - 1, Math.max(0, px))
    py = Math.min(H - 1, Math.max(0, py))
    const d = this.depth[py * W + px]
    if (d >= 0.9999) return { hit: false, position: [0, 0, 0], distance: 0 }
    // レイスケール復元 (shader-gen.mjs の生成WGSLと同一式)
    const near = this.view.nearFarViewport[0], far = this.view.nearFarViewport[1]
    const ndcOpaque = d * 2 - 1
    const axisOpaque = 2 * near * far / (far + near - ndcOpaque * (far - near))
    const ndcFrag = this._fragDepth * 2 - 1
    const axisFrag = 2 * near * far / (far + near - ndcFrag * (far - near))
    const scale = Math.max(axisOpaque / axisFrag, 1)
    const eye = this.packInputs.eyePosition
    const fp = this._fragPos
    const bx = eye[0] + (fp[0] - eye[0]) * scale
    const by = eye[1] + (fp[1] - eye[1]) * scale
    const bz = eye[2] + (fp[2] - eye[2]) * scale
    const dx = bx - eye[0], dy = by - eye[1], dz = bz - eye[2]
    return { hit: true, position: [bx, by, bz], distance: Math.sqrt(dx * dx + dy * dy + dz * dz) }
  }

  // -------------------------------------------------------- uniforms -----
  _updateUniforms(seconds) {
    const p = this.params
    const az = p.sunAzimuth * Math.PI / 180
    const el = p.sunElevation * Math.PI / 180
    const sun = [Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)]
    const night = (this.sceneId === 'night' || p.sunElevation < -2) ? 1 : 0

    const { yaw, pitch, dist, target } = this.camera
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    // orbit eye (renderer.mjs と同一修正): pitch>0 = 俯瞰
    const eye = [
      target[0] - dist * Math.sin(yaw) * cp,
      target[1] + dist * sp,
      target[2] + dist * Math.cos(yaw) * cp
    ]
    const aspect = this.resW / Math.max(1, this.resH)
    const near = 0.1, far = 400
    this.viewProj = mat4Mul(mat4Perspective(Math.PI / 3, aspect, near, far), mat4View(eye, yaw, -pitch))

    const PI = this.packInputs
    PI.seconds = seconds
    PI.lit = p.lit ? 1 : 0
    PI.renderOffset = [0, 0, 0]
    PI.sunDirection = sun
    PI.eyePosition = eye

    const V = this.view
    V.eye = eye
    V.nearFarViewport = [near, far, this.resW, this.resH]
    V.sunDirection = sun
    // 夜は ambient を底上げ (月光相当) して地形が潰れないようにする
    const ambient = night ? 0.38 : p.ambient * 0.35
    V.ambient = [ambient, ambient, ambient]
    V.diffuse = [p.diffuse, p.diffuse, p.diffuse]
    V.ambientLightColour = night ? [0.15, 0.17, 0.25] : [0.38, 0.42, 0.48]
    V.skyLightColour = night ? [0.32, 0.38, 0.55] : [1.0, 0.97, 0.90]
    V.heldLight = [p.heldLight * 0.95, p.heldLight * 0.85, p.heldLight * 0.65]
    const D = p.fogDistance
    V.fogParams = [D === 0 ? 0 : 32 * D, D === 0 ? 5 : 32 * (D + 1)]
    // フォグ色は地平線の空色に合わせる (GPU 側 renderer.mjs と同一)
    V.fogColour = night ? [0.08, 0.11, 0.21] : [0.66, 0.78, 0.91]

    this._skySun = sun
    this._skyNight = night
    this._skyFog = V.fogColour
    this._skySeconds = seconds
    this._skyInvRot = mat4InvViewNoTrans(yaw, -pitch)
    this._skyTan = [Math.tan(Math.PI / 6) * aspect, Math.tan(Math.PI / 6)]
  }

  _updateAnimLayers(seconds) {
    const bucket = Math.floor(seconds / 0.25)
    if (bucket === this._lastAnimBucket) return
    this._lastAnimBucket = bucket
    const layers = this.layers
    for (const L of this.animLadders) {
      layers[L.id] = L.rootLayer + (bucket % L.frames)
    }
  }

  // --------------------------------------------------------- raster ------
  _applyRes() {
    let [w, h] = this._resLadder[this._resIdx]
    const dw = this.canvas.width || w
    if (w > dw) { const k = dw / w; w = Math.max(64, Math.round(w * k)); h = Math.max(40, Math.round(h * k)) }
    if (w === this.resW && h === this.resH) return
    this.resW = w
    this.resH = h
    if (typeof ImageData !== 'undefined') {
      this.imgData = new ImageData(w, h)
    } else {
      this.imgData = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
    }
    this.depth = new Float32Array(w * h)
    if (this.bufCanvas) {
      this.bufCanvas.width = w
      this.bufCanvas.height = h
      this.bufCtx = this.bufCanvas.getContext('2d')
    } else {
      this.bufCanvas = makeOffscreen(w, h)
      this.bufCtx = this.bufCanvas ? this.bufCanvas.getContext('2d') : null
    }
    this._dirty = true
    this.onStatus({ type: 'soft-res', w, h })
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : null
    const cssW = rect ? rect.width : 800
    const cssH = rect ? rect.height : 500
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(1.5, window.devicePixelRatio) : 1
    const w = Math.max(320, Math.round(cssW * dpr))
    const h = Math.max(200, Math.round(cssH * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this._applyRes()
    }
  }

  start() {
    if (typeof requestAnimationFrame === 'undefined') return
    const loop = () => {
      this._raf = requestAnimationFrame(loop)
      this.render()
    }
    this._raf = requestAnimationFrame(loop)
  }

  stop() {
    if (this._raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this._raf)
    this._raf = null
  }

  destroy() {
    this.stop()
    this.ready = false
  }

  _camOrParamsChanged() {
    const c = this.camera, s = this._camSnap || (this._camSnap = { yaw: 0, pitch: 0, dist: 0, t: [0, 0, 0] })
    if (c.yaw !== s.yaw || c.pitch !== s.pitch || c.dist !== s.dist ||
        c.target[0] !== s.t[0] || c.target[1] !== s.t[1] || c.target[2] !== s.t[2]) return true
    const p = this.params, q = this._paramSnap || (this._paramSnap = {})
    for (const k in p) if (p[k] !== q[k]) return true
    return false
  }

  _snap() {
    const c = this.camera
    this._camSnap = { yaw: c.yaw, pitch: c.pitch, dist: c.dist, t: [...c.target] }
    this._paramSnap = { ...this.params }
  }

  render() {
    if (!this.ready || !this.programs) return
    const nowMs = performance.now()
    const seconds = nowMs / 1000 - this.startSeconds
    const animating = this._animates || (this._hasHeldModel && this.params.enchantTier > 0)
    if (!this._dirty && !this._camOrParamsChanged() &&
        (!animating || nowMs - this._lastDrawMs < 15)) return
    this._lastDrawMs = nowMs
    const t0 = nowMs

    this._updateUniforms(seconds)
    this._updateAnimLayers(seconds)
    this.depth.fill(1)
    this._drawSky()
    if (this.programs.terrain) this._drawProgram(this.programs.terrain)
    if (this.programs.model) this._drawProgram(this.programs.model)
    if (this.programs.liquid) this._drawProgram(this.programs.liquid)
    this._present()

    const ms = performance.now() - t0
    this._emaMs = this._emaMs == null ? ms : this._emaMs * 0.85 + ms * 0.15
    this._framesDrawn++
    if (this._framesDrawn % 10 === 0 && this._emaMs > 100 && this._resIdx < this._resLadder.length - 1) {
      this._resIdx++
      this._applyRes()
    }
    this._snap()
    this._dirty = false
  }

  _present() {
    if (!this.bufCtx || !this.ctx) return
    this.bufCtx.putImageData(this.imgData, 0, 0)
    this.ctx.imageSmoothingEnabled = true
    this.ctx.drawImage(this.bufCanvas, 0, 0, this.canvas.width, this.canvas.height)
  }

  // ---- skybox (renderer.mjs SKYBOX_WGSL の JS 移植: 四角い太陽/月 + 四角い雲) ----
  _drawSky() {
    const W = this.resW, H = this.resH
    const img = this.imgData.data
    const inv = this._skyInvRot
    const tanX = this._skyTan[0], tanY = this._skyTan[1]
    const sun = this._skySun
    const sx = sun[0], sy = sun[1], sz = sun[2]
    const sunLen2 = sx * sx + sy * sy + sz * sz
    const night = this._skyNight
    const seconds = this._skySeconds || 0
    const fog = this._skyFog
    // day/night を先にミックス (定数)
    const topR = mixN(0.28, 0.02, night), topG = mixN(0.47, 0.03, night), topB = mixN(0.83, 0.09, night)
    const horR = mixN(0.66, 0.08, night), horG = mixN(0.78, 0.11, night), horB = mixN(0.91, 0.21, night)
    const fogR = fog[0], fogG = fog[1], fogB = fog[2]
    const dayAmt = 1 - night
    // 太陽面の正規直交基底 (四角い太陽/月判定用)
    let bxx = 0, bxy = 1, bxz = 0
    if (sunLen2 > 1e-6) {
      let rx = 0, ry = 1, rz = 0
      if (Math.abs(sy) > 0.9) { rx = 1; ry = 0 }
      // bx = normalize(cross(sun, ref))
      bxx = sy * rz - sz * ry; bxy = sz * rx - sx * rz; bxz = sx * ry - sy * rx
      const bl = 1 / (Math.sqrt(bxx * bxx + bxy * bxy + bxz * bxz) || 1)
      bxx *= bl; bxy *= bl; bxz *= bl
      // by = cross(bx, sun)
      var byx = bxy * sz - bxz * sy
      var byy = bxz * sx - bxx * sz
      var byz = bxx * sy - bxy * sx
    }
    const cloudT = seconds * 0.010
    const cellHash = (cx, cy) => {
      const s = Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453
      return s - Math.floor(s)
    }
    let i = 0
    for (let py = 0; py < H; py++) {
      const ndcY = 1 - 2 * (py + 0.5) / H
      const dy = ndcY * tanY
      for (let px = 0; px < W; px++, i += 4) {
        const ndcX = 2 * (px + 0.5) / W - 1
        const dx = ndcX * tanX
        // dir = invRot * (dx, dy, -1), normalize
        let ux = inv[0] * dx + inv[4] * dy - inv[8]
        let uy = inv[1] * dx + inv[5] * dy - inv[9]
        let uz = inv[2] * dx + inv[6] * dy - inv[10]
        const il = 1 / (Math.sqrt(ux * ux + uy * uy + uz * uz) || 1)
        ux *= il; uy *= il; uz *= il
        const up = sat(uy * 0.5 + 0.5)
        const t = Math.pow(up, 0.6)
        let r = horR + (topR - horR) * t
        let g = horG + (topG - horG) * t
        let b = horB + (topB - horB) * t
        if (uy < 0) {
          const k = sat(-uy * 3)
          r += (fogR - r) * k; g += (fogG - g) * k; b += (fogB - b) * k
        }
        if (sunLen2 > 1e-6) {
          const sunDot = ux * sx + uy * sy + uz * sz
          // 四角い太陽/月 (sun に垂直な平面への射影)
          const du = ux * bxx + uy * bxy + uz * bxz
          const dv = ux * byx + uy * byy + uz * byz
          const m = Math.max(Math.abs(du), Math.abs(dv))
          const disk = 1 - smoothstep(0.060, 0.070, m)
          if (sunDot > 0) {
            const sunAmt = disk * (1 - night * 0.55)
            r += (1.0 - r) * sunAmt; g += (0.99 - g) * sunAmt; b += (0.90 - b) * sunAmt
            const s1 = sat(sunDot)
            const glow = Math.pow(s1, 220) * 0.22 + Math.pow(s1, 28) * 0.06
            r += glow * dayAmt; g += 0.85 * glow * dayAmt; b += 0.55 * glow * dayAmt
          } else {
            const moon = disk * night
            r += (1.0 - r) * moon; g += (1.0 - g) * moon; b += (1.05 - b) * moon
          }
        }
        // 四角い雲
        if (uy > 0.06) {
          const cu = (ux / uy) * 0.85 + cloudT
          const cv = (uz / uy) * 0.85
          const cellX = Math.floor(cu * 2.2), cellY = Math.floor(cv * 2.2)
          const v = cellHash(Math.floor(cellX / 3), Math.floor(cellY / 3)) * 0.75 + cellHash(cellX, cellY) * 0.25
          const cloudAmt = (v >= 0.62 ? 1 : 0) * sat((uy - 0.06) / 0.14) * (1 - night)
          if (cloudAmt > 0) {
            const cr = mixN(1.0, 0.30, night), cg = mixN(1.0, 0.33, night), cb = mixN(1.0, 0.42, night)
            r += (cr - r) * cloudAmt; g += (cg - g) * cloudAmt; b += (cb - b) * cloudAmt
          }
        }
        if (night > 0.01 && uy > 0.02) {
          const g0 = Math.floor(ux * 160), g1 = Math.floor(uy * 160), g2 = Math.floor(uz * 160)
          const s = Math.sin(g0 * 12.9898 + g1 * 78.233 + g2 * 37.719) * 43758.5453
          const hval = s - Math.floor(s)
          const star = hval >= 0.9985 ? night : 0
          const v = star * (0.5 + 0.5 * hval)
          r += v; g += v; b += v
        }
        img[i] = r * 255
        img[i + 1] = g * 255
        img[i + 2] = b * 255
        img[i + 3] = 255
      }
    }
  }

  // ---- メッシュ描画 (頂点処理 → クリップ → ラスタライズ) ----
  _drawProgram(prog) {
    if (prog.broken) return
    const mesh = this.meshes && this.meshes[prog.program]
    if (!mesh || !mesh.vertices.length) return
    const vout = this._processVertices(prog, mesh)
    const V = mesh.vertices
    const I = mesh.indices
    for (let t = 0; t + 2 < I.length; t += 3) {
      const i0 = I[t], i1 = I[t + 1], i2 = I[t + 2]
      const o0 = i0 * VOUT_STRIDE, o1 = i1 * VOUT_STRIDE, o2 = i2 * VOUT_STRIDE
      const vo = i0 * VERT_FLOATS
      const flat = {
        tid: V[vo + 13],
        rot: V[vo + 14],
        flags: V[vo + 16],
        light: V[vo + 17]
      }
      this._rasterTriangle(prog, vout, o0, o1, o2, flat)
    }
  }

  _processVertices(prog, mesh) {
    const V = mesh.vertices
    const n = V.length / VERT_FLOATS
    if (!prog.vout || prog.vout.length !== n * VOUT_STRIDE) {
      prog.vout = new Float32Array(n * VOUT_STRIDE)
    }
    const out = prog.vout
    const vp = this.viewProj
    const m0 = vp[0], m1 = vp[1], m2 = vp[2], m3 = vp[3]
    const m4 = vp[4], m5 = vp[5], m6 = vp[6], m7 = vp[7]
    const m8 = vp[8], m9 = vp[9], m10 = vp[10], m11 = vp[11]
    const m12 = vp[12], m13 = vp[13], m14 = vp[14], m15 = vp[15]
    const hook = prog.hookVertex
    for (let i = 0; i < n; i++) {
      const o = i * VERT_FLOATS
      const q = i * VOUT_STRIDE
      let px = V[o], py = V[o + 1], pz = V[o + 2]
      if (hook) {
        const vin = {
          position: [px, py, pz],
          normal: [V[o + 3], V[o + 4], V[o + 5]],
          localPosition: [V[o + 18], V[o + 19], V[o + 20]],
          flags: this._decodeFlags(V[o + 16])
        }
        try {
          const vout2 = hook(vin)
          if (vout2 && Array.isArray(vout2.position)) {
            px = vout2.position[0]; py = vout2.position[1]; pz = vout2.position[2]
          }
        } catch (e) { /* 頂点フックの失敗は頂点移動なしとして続行 */ }
      }
      out[q] = m0 * px + m4 * py + m8 * pz + m12
      out[q + 1] = m1 * px + m5 * py + m9 * pz + m13
      out[q + 2] = m2 * px + m6 * py + m10 * pz + m14
      out[q + 3] = m3 * px + m7 * py + m11 * pz + m15
      out[q + 4] = px; out[q + 5] = py; out[q + 6] = pz
      out[q + 7] = V[o + 3]; out[q + 8] = V[o + 4]; out[q + 9] = V[o + 5]
      out[q + 10] = V[o + 6] / 255; out[q + 11] = V[o + 7] / 255
      out[q + 12] = V[o + 8] / 255; out[q + 13] = V[o + 9] / 255
      out[q + 14] = V[o + 10]; out[q + 15] = V[o + 11]
      out[q + 16] = V[o + 15]
      out[q + 17] = V[o + 18]; out[q + 18] = V[o + 19]; out[q + 19] = V[o + 20]
    }
    return out
  }

  _decodeFlags(bits) {
    let f = this._flagsCache.get(bits)
    if (f) return f
    f = {}
    for (let i = 0; i < 14; i++) f[FLAG_NAMES[i]] = ((bits >>> i) & 1) === 1
    this._flagsCache.set(bits, f)
    return f
  }

  // 3頂点 (vout オフセット指定) → クリップ → ラスタライズ
  // クリップはニア面 z_clip >= 0 のみで十分: z_clip >= 0 ⟺ z_view <= -near で
  // あるため、通過頂点は必ず w >= near > 0 を満たす (w 単独のクリップ不要)。
  _rasterTriangle(prog, vout, o0, o1, o2, flat) {
    const z0 = vout[o0 + 2], z1 = vout[o1 + 2], z2 = vout[o2 + 2]
    if (z0 < 0 && z1 < 0 && z2 < 0) return
    if (z0 >= 0 && z1 >= 0 && z2 >= 0) {
      this._rasterClipped(prog, this._screenVert(vout, o0), this._screenVert(vout, o1), this._screenVert(vout, o2), flat)
      return
    }
    // ニア面 (z >= 0) で Sutherland-Hodgman クリップ
    const poly = [this._clipVert(vout, o0), this._clipVert(vout, o1), this._clipVert(vout, o2)]
    const out = []
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length]
      const ain = a.cz >= 0, bin = b.cz >= 0
      if (ain) out.push(a)
      if (ain !== bin) {
        const t = a.cz !== b.cz ? a.cz / (a.cz - b.cz) : 0
        out.push(this._lerpVert(a, b, t))
      }
    }
    if (out.length < 3) return
    const sv = out.map(v => this._screenVertFromClip(v))
    for (let i = 1; i + 1 < sv.length; i++) {
      this._rasterClipped(prog, sv[0], sv[i], sv[i + 1], flat)
    }
  }

  // クリップ空間頂点 (クリップ用の中間表現)
  _clipVert(vout, o) {
    return {
      cx: vout[o], cy: vout[o + 1], cz: vout[o + 2], cw: vout[o + 3],
      v: vout.slice(o + 4, o + 20) // 16 float の varying
    }
  }

  _lerpVert(a, b, t) {
    const v = new Float32Array(16)
    for (let i = 0; i < 16; i++) v[i] = a.v[i] + (b.v[i] - a.v[i]) * t
    return {
      cx: a.cx + (b.cx - a.cx) * t,
      cy: a.cy + (b.cy - a.cy) * t,
      cz: a.cz + (b.cz - a.cz) * t,
      cw: a.cw + (b.cw - a.cw) * t,
      v
    }
  }

  // vout オフセットからスクリーン頂点
  _screenVert(vout, o) {
    const w = vout[o + 3]
    const s = {
      x: (vout[o] / w * 0.5 + 0.5) * this.resW,
      y: (0.5 - vout[o + 1] / w * 0.5) * this.resH,
      z: vout[o + 2] / w,
      iw: 1 / w,
      v: vout.slice(o + 4, o + 20)
    }
    return s
  }

  _screenVertFromClip(c) {
    const w = c.cw
    return {
      x: (c.cx / w * 0.5 + 0.5) * this.resW,
      y: (0.5 - c.cy / w * 0.5) * this.resH,
      z: c.cz / w,
      iw: 1 / w,
      v: c.v
    }
  }

  _rasterClipped(prog, A, B, C, flat) {
    const W = this.resW, H = this.resH
    const depth = this.depth
    const img = this.imgData.data
    const isLiquid = prog.isLiquid
    const x0 = A.x, y0 = A.y, x1 = B.x, y1 = B.y, x2 = C.x, y2 = C.y
    if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) return
    const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
    if (area === 0 || !isFinite(area)) return
    const invArea = 1 / area
    const minX = Math.max(0, Math.ceil(Math.min(x0, x1, x2) - 0.5))
    const maxX = Math.min(W - 1, Math.floor(Math.max(x0, x1, x2) - 0.5))
    const minY = Math.max(0, Math.ceil(Math.min(y0, y1, y2) - 0.5))
    const maxY = Math.min(H - 1, Math.floor(Math.max(y0, y1, y2) - 0.5))
    if (minX > maxX || minY > maxY) return

    const iw0 = A.iw, iw1 = B.iw, iw2 = C.iw
    const a0 = A.v, a1 = B.v, a2 = C.v
    const F = prog.F

    for (let py = minY; py <= maxY; py++) {
      const cy = py + 0.5
      const rowBase = (x2 - x1) * (cy - y1) - (y2 - y1) * (minX + 0.5 - x1)
      let e0 = rowBase
      let e1 = (x0 - x2) * (cy - y2) - (y0 - y2) * (minX + 0.5 - x2)
      let e2 = (x1 - x0) * (cy - y0) - (y1 - y0) * (minX + 0.5 - x0)
      const step0 = -(y2 - y1), step1 = -(y0 - y2), step2 = -(y1 - y0)
      for (let px = minX; px <= maxX; px++, e0 += step0, e1 += step1, e2 += step2) {
        const l0 = e0 * invArea, l1 = e1 * invArea, l2 = e2 * invArea
        if (l0 < 0 || l1 < 0 || l2 < 0) continue
        const k0 = l0 * iw0, k1 = l1 * iw1, k2 = l2 * iw2
        const denom = k0 + k1 + k2
        if (denom <= 0 || !isFinite(denom)) continue
        const d = 1 / denom
        const zdepth = l0 * A.z + l1 * B.z + l2 * C.z
        const di = py * W + px
        if (zdepth >= depth[di]) continue

        // varying 補間 (perspective-correct)
        F.vPosition[0] = (k0 * a0[0] + k1 * a1[0] + k2 * a2[0]) * d
        F.vPosition[1] = (k0 * a0[1] + k1 * a1[1] + k2 * a2[1]) * d
        F.vPosition[2] = (k0 * a0[2] + k1 * a1[2] + k2 * a2[2]) * d
        F.vNormal[0] = (k0 * a0[3] + k1 * a1[3] + k2 * a2[3]) * d
        F.vNormal[1] = (k0 * a0[4] + k1 * a1[4] + k2 * a2[4]) * d
        F.vNormal[2] = (k0 * a0[5] + k1 * a1[5] + k2 * a2[5]) * d
        F.vColour[0] = (k0 * a0[6] + k1 * a1[6] + k2 * a2[6]) * d
        F.vColour[1] = (k0 * a0[7] + k1 * a1[7] + k2 * a2[7]) * d
        F.vColour[2] = (k0 * a0[8] + k1 * a1[8] + k2 * a2[8]) * d
        F.vColour[3] = (k0 * a0[9] + k1 * a1[9] + k2 * a2[9]) * d
        F.vUv[0] = (k0 * a0[10] + k1 * a1[10] + k2 * a2[10]) * d
        F.vUv[1] = (k0 * a0[11] + k1 * a1[11] + k2 * a2[11]) * d
        F.vMipLevel = (k0 * a0[12] + k1 * a1[12] + k2 * a2[12]) * d
        F.vLocalPosition[0] = (k0 * a0[13] + k1 * a1[13] + k2 * a2[13]) * d
        F.vLocalPosition[1] = (k0 * a0[14] + k1 * a1[14] + k2 * a2[14]) * d
        F.vLocalPosition[2] = (k0 * a0[15] + k1 * a1[15] + k2 * a2[15]) * d
        F.vTextureId = flat.tid
        F.vTextureRotation = flat.rot
        F.vFlagsBits = flat.flags
        F.vLightLevels = flat.light

        // フラグメント実行
        let rgba
        try {
          rgba = this._runFragment(prog, F, px, py, zdepth)
        } catch (e) {
          if (e && e.__wgslDiscard) continue
          this._fragError(e, prog)
          continue
        }
        if (!rgba) continue
        const ii = di * 4
        if (isLiquid) {
          // blend: color = src.rgb*src.a + dst.rgb*(1-src.a), alpha は 1 を維持
          const sa = rgba[3]
          const ia = 1 - sa
          img[ii] = rgba[0] * sa * 255 + img[ii] * ia
          img[ii + 1] = rgba[1] * sa * 255 + img[ii + 1] * ia
          img[ii + 2] = rgba[2] * sa * 255 + img[ii + 2] * ia
          img[ii + 3] = 255
        } else {
          img[ii] = rgba[0] * 255
          img[ii + 1] = rgba[1] * 255
          img[ii + 2] = rgba[2] * 255
          img[ii + 3] = 255
          depth[di] = zdepth
        }
      }
    }
  }

  _fragError(e, prog) {
    this._fragErrors++
    if (this._fragErrors === 1) {
      this.onStatus({
        type: 'wgsl-errors',
        errors: [{ program: prog.program, message: 'CPU preview: runtime error in pack code — ' + String(e && e.message || e).slice(0, 300) }]
      })
    }
    if (this._fragErrors > 200) prog.broken = true
  }

  // shader-gen.mjs の fsMain / buildSurfaceIn / buildLightIn の JS ミラー
  _runFragment(prog, F, px, py, zdepth) {
    const M = prog.M
    const S = prog.S
    const view = this.view

    this._fragRot = F.vTextureRotation
    this._fragPos = F.vPosition
    this._fragScreenUV[0] = (px + 0.5) / this.resW
    this._fragScreenUV[1] = (py + 0.5) / this.resH
    this._fragDepth = zdepth

    // ---- buildSurfaceIn ----
    S.colour[0] = F.vColour[0]; S.colour[1] = F.vColour[1]; S.colour[2] = F.vColour[2]
    S.alpha = F.vColour[3]
    S.enchantTier = 0
    S.enchantColour = this._zero4
    S.enchantSpeed = 0
    S.overlayColour = this._zero4
    if (prog.isModel) {
      const fl = this._decodeFlags(F.vFlagsBits)
      if (fl.held && view.enchantTierOverlay[0] > 0) {
        S.enchantTier = view.enchantTierOverlay[0]
        const e = view.enchantRGB
        S.enchantColour = [e[0], e[1], e[2], 0.30 + 0.25 * Math.sin(this.packInputs.seconds * e[3])]
        S.enchantSpeed = e[3]
      }
      if (view.enchantTierOverlay[1] !== 0 && fl.lifeform) {
        S.overlayColour = view.overlay
      }
    }
    S.position = F.vPosition
    S.normal = F.vNormal
    S.localPosition = F.vLocalPosition
    S.flags = this._decodeFlags(F.vFlagsBits)
    S.textureId = F.vTextureId
    S.textureRotation = F.vTextureRotation
    S.uv = F.vUv
    S.mipLevel = F.vMipLevel

    // ---- surface フック ----
    const sout = prog.hookSurface ? prog.hookSurface(S) : M.bloxdDefaultSurface(S)
    const a = (prog.isLiquid || !this.strict) ? sout.alpha : 1
    if (!prog.isLiquid && !this.strict && a < 0.5) return null // discard

    // ---- buildLightIn ----
    const L = prog.L
    this._buildLightIn(prog, F, L)

    const lit = M.bloxdLitColour(sout, L)
    let rgb
    if (prog.hookLight) {
      const L2 = prog.L2
      const keys = L2._keys
      for (let i = 0; i < keys.length; i++) L2[keys[i]] = L[keys[i]]
      L2.litColour = lit
      const lout = prog.hookLight(sout, L2)
      rgb = lout ? lout.colour : this._zero3
    } else {
      const em = sout.emission || this._zero3
      rgb = M.bloxdApplyFog([lit[0] + em[0], lit[1] + em[1], lit[2] + em[2]], L)
    }
    const out = this._outRGBA
    out[0] = sat(rgb[0]); out[1] = sat(rgb[1]); out[2] = sat(rgb[2]); out[3] = a
    return out
  }

  _buildLightIn(prog, F, L) {
    const view = this.view
    const PI = this.packInputs
    const bits = F.vLightLevels
    const rLevel = (bits >>> 24) & 15
    const gLevel = (bits >>> 20) & 15
    const bLevel = (bits >>> 16) & 15
    const skyLevel = (bits >>> 12) & 15
    const lift = lv => { const x = Math.min(1, Math.max(0, lv / 15)); return 1 - Math.pow(1 - x / (3 - 2 * x), 3) }
    const br = lift(rLevel), bg = lift(gLevel), bb = lift(bLevel)
    const brightest = Math.max(br, bg, bb)
    const floor35 = brightest * 0.35
    L.blockLight[0] = Math.max(br, floor35)
    L.blockLight[1] = Math.max(bg, floor35)
    L.blockLight[2] = Math.max(bb, floor35)
    let skyLight = lift(skyLevel)
    let alc = view.ambientLightColour
    let slc = view.skyLightColour
    let held = view.heldLight
    if (!PI.lit) {
      L.blockLight[0] = 0; L.blockLight[1] = 0; L.blockLight[2] = 0
      held = this._zero3
      skyLight = 1
      alc = this._white3 || (this._white3 = [1, 1, 1])
      slc = this._white3
    }
    L.litColour[0] = 0; L.litColour[1] = 0; L.litColour[2] = 0
    // 2-light Lambert: main (sun 1.0) + fill ([-0.5,-1,-1] 正規化, 0.45)
    const n = F.vNormal
    let nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1
    const nx = n[0] / nl, ny = n[1] / nl, nz = n[2] / nl
    const sun = PI.sunDirection
    const sunLen2 = sun[0] * sun[0] + sun[1] * sun[1] + sun[2] * sun[2]
    let mainL = 0
    if (sunLen2 > 1e-8) {
      const dot = nx * sun[0] + ny * sun[1] + nz * sun[2]
      mainL = sat(dot)
    }
    // fillDir = normalize([-0.5, -1, -1]) = [-0.3333, -0.6667, -0.6667]
    const fillL = sat(-(nx * 0.5 + ny + nz) / 1.5) * 0.45
    L.directional = mainL + fillL
    L.diffuse = view.diffuse
    const flags = this._decodeFlags(F.vFlagsBits)
    L.emissive = flags.emissive ? this._emissive3 || (this._emissive3 = [0.55, 0.50, 0.45]) : this._zero3
    L.ambient = view.ambient
    L.skyLight = skyLight
    L.ambientLightColour = alc
    L.skyLightColour = slc
    L.heldLight = held
    L.fogColour = view.fogColour
    const eye = PI.eyePosition
    const fp = F.vPosition
    const dist = Math.sqrt((fp[0] - eye[0]) ** 2 + (fp[1] - eye[1]) ** 2 + (fp[2] - eye[2]) ** 2)
    const fs = view.fogParams[0], fe = view.fogParams[1]
    L.fogAlpha = Math.min(1, Math.max(0, 1 - (fe - dist) / (fe - fs)))
    L.position = F.vPosition
    L.normal = F.vNormal
    L.localPosition = F.vLocalPosition
    L.flags = flags
    L.textureId = F.vTextureId
    L.textureRotation = F.vTextureRotation
    L.uv = F.vUv
    L.mipLevel = F.vMipLevel
  }
}

export default StudioSoftRenderer
