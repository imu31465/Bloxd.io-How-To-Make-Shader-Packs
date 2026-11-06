// Shader Studio レンダラー: WebGPU 初期化・アトラス構築・6バリアントの
// パイプライン管理・レンダーループ。シェーダー生成は shader-gen.mjs、
// シーンは scenes.mjs、テクスチャは textures.mjs。

import { makeShaderSource } from './shader-gen.mjs'
import { buildAtlasPixels, buildMips, animLadderInfo, ATLAS_TILE, ATLAS_LAYERS } from './textures.mjs'
import { buildMeshes, SCENES } from './scenes.mjs'

const FLOATS_PER_VERTEX = 21 // 84B (scenes.mjs の 1 頂点 21 float と一致)
const MIP_LEVELS = 4         // 16, 8, 4, 2

// ------------------------------------------------------------ skybox ----
const SKYBOX_WGSL = /* wgsl */`
struct SkyUniforms {
  invRot: mat4x4f,        // カメラ回転の逆 (yaw/pitch)
  tanHalf: vec4f,         // tan(fov/2)*aspect, tan(fov/2), 0, 0
  sunDirection: vec4f,    // xyz
  night: vec4f,           // x = night [0,1], y = seconds (雲の流れ)
  fogColour: vec4f,       // xyz
};
@group(0) @binding(0) var<uniform> sky: SkyUniforms;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) dir: vec3f,
};

@vertex
fn vsMain(@builtin(vertex_index) vi: u32) -> VOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VOut;
  let v = p[vi];
  let dirCam = vec3f(v.x * sky.tanHalf.x, v.y * sky.tanHalf.y, -1.0);
  out.dir = (sky.invRot * vec4f(dirCam, 0.0)).xyz;
  out.pos = vec4f(v, 0.99999, 1.0);
  return out;
}

fn skyCellHash(c: vec2f) -> f32 {
  return fract(sin(dot(c, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fsMain(in: VOut) -> @location(0) vec4f {
  let d = normalize(in.dir);
  let up = saturate(d.y * 0.5 + 0.5);
  let night = sky.night.x;
  let seconds = sky.night.y;
  let dayTop = vec3f(0.28, 0.47, 0.83);
  let dayHorizon = vec3f(0.66, 0.78, 0.91);
  let nightTop = vec3f(0.02, 0.03, 0.09);
  let nightHorizon = vec3f(0.08, 0.11, 0.21);
  let top = mix(dayTop, nightTop, night);
  let horizon = mix(dayHorizon, nightHorizon, night);
  var skyCol = mix(horizon, top, pow(up, 0.6));
  if (d.y < 0.0) {
    skyCol = mix(skyCol, sky.fogColour.xyz, saturate(-d.y * 3.0));
  }
  let sun = sky.sunDirection.xyz;
  let sunDot = dot(d, sun);
  if (dot(sun, sun) > 1e-6) {
    // 四角い太陽/月 (bloxd・MC風): sun に垂直な平面への射影で判定
    let ref = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(sun.y) > 0.9);
    let bx = normalize(cross(sun, ref));
    let by = cross(bx, sun);
    let du = dot(d, bx);
    let dv = dot(d, by);
    let m = max(abs(du), abs(dv));
    let disk = 1.0 - smoothstep(0.060, 0.070, m);
    if (sunDot > 0.0) {
      let sunAmt = disk * (1.0 - night * 0.55);
      skyCol = mix(skyCol, vec3f(1.0, 0.99, 0.90), sunAmt); // 四角く塗りつぶす
      let glow = pow(saturate(sunDot), 220.0) * 0.22 + pow(saturate(sunDot), 28.0) * 0.06;
      skyCol += vec3f(1.0, 0.85, 0.55) * glow * (1.0 - night);
    } else {
      let moon = disk * night;
      skyCol = mix(skyCol, vec3f(1.0, 1.0, 1.05), moon);
    }
  }
  // 四角い雲 (高度固定平面 + 量子化ノイズ、ゆっくり流れる。塊で出る)
  if (d.y > 0.06) {
    let t = seconds * 0.010;
    let cu = (d.x / d.y) * 0.85 + t;
    let cv = (d.z / d.y) * 0.85;
    let cell = floor(vec2f(cu, cv) * 2.2);
    let big = floor(cell / 3.0);
    let v = skyCellHash(big) * 0.75 + skyCellHash(cell) * 0.25;
    let cloudAmt = step(0.62, v) * saturate((d.y - 0.06) / 0.14) * (1.0 - night);
    let cloudCol = mix(vec3f(1.0, 1.0, 1.0), vec3f(0.30, 0.33, 0.42), night);
    skyCol = mix(skyCol, cloudCol, cloudAmt);
  }
  if (night > 0.01 && d.y > 0.02) {
    let g = floor(d * 160.0);
    let h = fract(sin(dot(g, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
    let star = step(0.9985, h) * night;
    skyCol += vec3f(star) * (0.5 + 0.5 * h);
  }
  return vec4f(skyCol, 1.0);
}
`

// ------------------------------------------------------------ matrices ---
export function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2)
  const o = new Float32Array(16)
  o[0] = f / aspect; o[5] = f
  o[10] = far / (near - far); o[11] = -1
  o[14] = (far * near) / (near - far)
  return o
}
export function mat4View(eye, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const fwd = [sy * cp, sp, -cy * cp]
  const right = [cy, 0, sy]
  const up = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0]
  ]
  const o = new Float32Array(16)
  o[0] = right[0]; o[4] = right[1]; o[8] = right[2]
  o[1] = up[0]; o[5] = up[1]; o[9] = up[2]
  o[2] = -fwd[0]; o[6] = -fwd[1]; o[10] = -fwd[2]
  o[12] = -(right[0] * eye[0] + right[1] * eye[1] + right[2] * eye[2])
  o[13] = -(up[0] * eye[0] + up[1] * eye[1] + up[2] * eye[2])
  o[14] = (fwd[0] * eye[0] + fwd[1] * eye[1] + fwd[2] * eye[2])
  o[15] = 1
  return o
}
export function mat4Mul(a, b) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[0 * 4 + r] * b[c * 4 + 0] + a[1 * 4 + r] * b[c * 4 + 1] + a[2 * 4 + r] * b[c * 4 + 2] + a[3 * 4 + r] * b[c * 4 + 3]
  }
  return o
}
// カメラ回転の逆 (world←camera、平行移動なし) — skybox の方向復元用
export function mat4InvViewNoTrans(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const fwd = [sy * cp, sp, -cy * cp]
  const right = [cy, 0, sy]
  const up = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0]
  ]
  const o = new Float32Array(16)
  o[0] = right[0]; o[1] = right[1]; o[2] = right[2]
  o[4] = up[0]; o[5] = up[1]; o[6] = up[2]
  o[8] = -fwd[0]; o[9] = -fwd[1]; o[10] = -fwd[2]
  o[15] = 1
  return o
}

// ------------------------------------------------------------ renderer ---
export class StudioRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.onStatus = opts.onStatus || (() => {})
    this.ready = false
    this.sceneId = 'plains'
    this.strict = false
    this.userCode = ''
    this.pipelines = null
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
    this._lastAnimBucket = -1
    this._pendingCompile = []
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser. Use Chrome/Edge 113+, Firefox 141+, or Safari 26+.')
    }
    this.adapter = await navigator.gpu.requestAdapter()
    if (!this.adapter) throw new Error('WebGPU adapter unavailable')
    // アトラスは ATLAS_LAYERS (1232) 層で、WebGPU の既定上限
    // maxTextureArrayLayers=256 を超える。requiredLimits で明示的に
    // 要求しないと createTexture が Invalid Texture になり、以降の
    // writeTexture / createView / createBindGroup が連鎖して失敗する。
    // 要求値がアダプター上限を超えると requestDevice 自体が reject され
    // るため、先にアダプター上限を確認する (この時点なら canvas への
    // コンテキスト取得前なので、CPU フォールバックへの退路も残る)。
    const adapterMaxLayers = this.adapter.limits?.maxTextureArrayLayers ?? 256
    if (adapterMaxLayers < ATLAS_LAYERS) {
      throw new Error(
        `GPU texture array limit too small: adapter supports ${adapterMaxLayers} layers, atlas needs ${ATLAS_LAYERS}.`
      )
    }
    this.device = await this.adapter.requestDevice({
      requiredLimits: { maxTextureArrayLayers: ATLAS_LAYERS }
    })
    this.ctx = this.canvas.getContext('webgpu')
    this.format = navigator.gpu.getPreferredCanvasFormat()
    this.ctx.configure({ device: this.device, format: this.format, alphaMode: 'opaque' })

    this._buildAtlas()
    this._buildUniforms()
    this._buildSkybox()
    this.setScene(this.sceneId, this._pendingSceneExtra || {})
    this.ready = true
    this._recompile()
  }

  // ---- アトラス (1232層 × 16x16 × 4 mip) ----
  _buildAtlas() {
    const pixels = buildAtlasPixels()
    const mips = buildMips(pixels)
    const sizes = [ATLAS_TILE, 8, 4, 2]
    this.atlasTex = this.device.createTexture({
      size: [ATLAS_TILE, ATLAS_TILE, ATLAS_LAYERS],
      dimension: '2d',
      format: 'rgba8unorm',
      mipLevelCount: MIP_LEVELS,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })
    for (let m = 0; m < MIP_LEVELS; m++) {
      const data = mips[m]
      const expected = ATLAS_LAYERS * sizes[m] * sizes[m] * 4
      const use = data.length === expected ? data : mips[0]
      this.device.queue.writeTexture(
        { texture: this.atlasTex, mipLevel: m },
        use,
        { bytesPerRow: sizes[m] * 4, rowsPerImage: sizes[m] },
        [sizes[m], sizes[m], ATLAS_LAYERS]
      )
    }
    this.atlasSampler = this.device.createSampler({ magFilter: 'nearest', minFilter: 'nearest', addressModeU: 'repeat', addressModeV: 'repeat' })

    // bloxdSpTextureLayers: id → layer。anim 族は 250ms バケットで更新。
    const layers = new Uint32Array(ATLAS_LAYERS + 1)
    for (let id = 0; id <= ATLAS_LAYERS; id++) layers[id] = Math.max(0, id - 1)
    this.layersBuf = this.device.createBuffer({ size: (ATLAS_LAYERS + 1) * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    this.device.queue.writeBuffer(this.layersBuf, 0, layers)
    this.animLadders = animLadderInfo()
    this._animScratch = layers
  }

  _buildUniforms() {
    // bloxdPackInputs: 64B (エンジン実測レイアウト)
    this.packInputsBuf = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.packInputsData = new ArrayBuffer(64)
    // view uniform: vec4 並び 272B → 288B (256アライン)
    this.viewBuf = this.device.createBuffer({ size: 288, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.viewData = new ArrayBuffer(288)
    // skybox uniform: 128B
    this.skyBuf = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  }

  _buildSkybox() {
    const module = this.device.createShaderModule({ code: SKYBOX_WGSL })
    this.skyPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vsMain' },
      fragment: { module, entryPoint: 'fsMain', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' }
    })
    this.skyBind = this.device.createBindGroup({
      layout: this.skyPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.skyBuf } }]
    })
  }

  // ---- シーン ----
  setScene(sceneId, extra = {}) {
    this.sceneId = sceneId
    this._pendingSceneExtra = extra
    // WebGPU 初期化前は ID だけ保持 (init() 完了後に適用される)
    if (!this.device) return false
    const maker = SCENES[sceneId]
    if (!maker) return false
    this.scene = maker(extra.seed)
    const meshes = buildMeshes(this.scene)
    this._uploadMeshes(meshes)
    this.camera.yaw = this.scene.lookYaw ?? 0
    this.camera.pitch = this.scene.lookPitch ?? 0.3
    const c = this.scene.camera
    this.camera.dist = this.scene.camDist ?? (c ? Math.hypot(c[0], c[1], c[2]) * 0.55 : 24)
    this.camera.target = this.scene.camTarget ?? [0, this.sceneId === 'cave' ? -3 : 3, 0]
    if (sceneId === 'night') this.params.sunElevation = -12
    else if (this.params.sunElevation < 0) this.params.sunElevation = 54
    return true
  }

  _uploadMeshes(meshes) {
    this.vertexLayout = {
      arrayStride: FLOATS_PER_VERTEX * 4,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },   // position
        { shaderLocation: 1, offset: 12, format: 'float32x3' },  // normal
        { shaderLocation: 2, offset: 24, format: 'float32x4' },  // colourRaw
        { shaderLocation: 3, offset: 40, format: 'float32x2' },  // uv
        { shaderLocation: 4, offset: 48, format: 'float32' },    // atlasIndex
        { shaderLocation: 5, offset: 52, format: 'uint32' },     // textureId
        { shaderLocation: 6, offset: 56, format: 'uint32' },     // textureRotation
        { shaderLocation: 7, offset: 60, format: 'float32' },    // mipLevel
        { shaderLocation: 8, offset: 64, format: 'uint32' },     // flagsBits
        { shaderLocation: 9, offset: 68, format: 'uint32' },     // lightLevels
        { shaderLocation: 10, offset: 72, format: 'float32x3' }  // localPosition
      ]
    }
    this.meshes = {}
    for (const p of ['terrain', 'liquid', 'model']) {
      const m = meshes[p]
      if (!m.vertices.length) { this.meshes[p] = null; continue }
      const vbuf = this.device.createBuffer({ size: m.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST })
      this.device.queue.writeBuffer(vbuf, 0, m.vertices)
      const ibuf = this.device.createBuffer({ size: m.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST })
      this.device.queue.writeBuffer(ibuf, 0, m.indices)
      this.meshes[p] = { vbuf, ibuf, count: m.indices.length }
    }
  }

  // ---- パックコード ----
  setPack(code) {
    this.userCode = code
    if (this.ready) this._recompile()
  }

  setStrict(strict) {
    this.strict = strict
    if (this.ready) this._recompile()
  }

  _recompile() {
    this.compileErrors = []
    this.pipelines = {}
    this.hookInfo = {}
    this._pendingCompile = []
    for (const program of ['terrain', 'liquid', 'model']) {
      const gen = makeShaderSource(this.userCode, program, this.strict)
      if (gen.errors && gen.errors.length) {
        this.compileErrors.push(...gen.errors.map(e => ({ program, ...e })))
        this.pipelines[program] = null
        continue
      }
      const module = this.device.createShaderModule({ code: gen.source })
      this._pendingCompile.push({ module, program })
      this.pipelines[program] = { module, gen }
      this.hookInfo[program] = gen.hasHooks
    }
    this._buildPipelines()
    this.onStatus({ type: 'compiled', errors: this.compileErrors, hooks: this.hookInfo })
    // 非同期で WGSL コンパイルエラーを回収
    this.checkCompileErrors().then(errs => {
      if (errs.length) {
        this.onStatus({ type: 'wgsl-errors', errors: errs })
      }
    })
  }

  async checkCompileErrors() {
    const errs = []
    for (const { module, program } of this._pendingCompile) {
      const info = await module.getCompilationInfo()
      for (const m of info.messages) {
        if (m.type === 'error') {
          // 行番号をユーザーコード基準に変換する情報も添える (module内行 = header+user+runtime)
          errs.push({ program, line: m.lineNum, message: String(m.message || '').slice(0, 400) })
        }
      }
    }
    this._pendingCompile = []
    this.compileErrors = this.compileErrors.filter(e => !e.wgsl)
    this.compileErrors.push(...errs.map(e => ({ ...e, wgsl: true })))
    return errs
  }

  _buildPipelines() {
    if (!this.pipelines) return
    const entries0 = [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
    ]
    this.bgl0 = this.device.createBindGroupLayout({ entries: entries0 })

    const entries3 = [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } }
    ]
    if (this.pipelines.liquid) {
      entries3.push({ binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth', viewDimension: '2d' } })
      entries3.push({ binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'non-filtering' } })
    }
    this.bgl3 = this.device.createBindGroupLayout({ entries: entries3 })

    for (const program of ['terrain', 'liquid', 'model']) {
      const p = this.pipelines[program]
      if (!p) continue
      const isLiquid = program === 'liquid'
      const targets = [{
        format: this.format,
        ...(isLiquid ? {
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          }
        } : {})
      }]
      try {
        p.pipeline = this.device.createRenderPipeline({
          layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bgl3] }),
          vertex: { module: p.module, entryPoint: 'vsMain', buffers: [this.vertexLayout] },
          fragment: { module: p.module, entryPoint: 'fsMain', targets },
          primitive: { topology: 'triangle-list', cullMode: 'none' },
          depthStencil: {
            format: 'depth24plus',
            depthWriteEnabled: !isLiquid,
            depthCompare: 'less'
          }
        })
      } catch (e) {
        this.compileErrors.push({ program, message: String(e).slice(0, 400), wgsl: true })
        p.pipeline = null
      }
    }
    this._ensureDepthTexture()
    this._buildBindGroups()
  }

  _ensureDepthTexture() {
    const w = this.canvas.width, h = this.canvas.height
    if (this.depthTex && this.depthTex.width === w && this.depthTex.height === h) return
    if (this.depthTex) this.depthTex.destroy()
    if (this.depthCopyTex) this.depthCopyTex.destroy()
    this.depthTex = this.device.createTexture({
      size: [w, h], format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
    })
    this.depthView = this.depthTex.createView()
    // liquid 用のサンプルコピー: 同一テクスチャを同一パスで attachment と
    // binding の両方には使えない (WebGPU の usage scope 規則) ので、liquid
    // パスの直前にコピーしてこちらをサンプルする。
    this.depthCopyTex = this.device.createTexture({
      size: [w, h], format: 'depth24plus',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })
    this.depthCopyView = this.depthCopyTex.createView()
    this.depthSampler = this.device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' })
    if (this.bgl3) this._buildBindGroups()
  }

  _buildBindGroups() {
    if (!this.bgl0) return
    this.bg0 = this.device.createBindGroup({
      layout: this.bgl0,
      entries: [
        { binding: 0, resource: { buffer: this.viewBuf } },
        { binding: 1, resource: this.atlasTex.createView({ dimension: '2d-array' }) },
        { binding: 2, resource: this.atlasSampler }
      ]
    })
    const e3 = [
      { binding: 0, resource: { buffer: this.packInputsBuf } },
      { binding: 2, resource: { buffer: this.layersBuf } }
    ]
    if (this.bgl3.entries.length > 2 && this.depthCopyView) {
      e3.push({ binding: 1, resource: this.depthCopyView })
      e3.push({ binding: 3, resource: this.depthSampler })
    }
    this.bg3 = this.device.createBindGroup({ layout: this.bgl3, entries: e3 })
  }

  // ---- uniform 更新 ----
  _updateUniforms() {
    const p = this.params
    const seconds = (performance.now() / 1000 - this.startSeconds)

    const az = p.sunAzimuth * Math.PI / 180
    const el = p.sunElevation * Math.PI / 180
    const sun = [
      Math.cos(el) * Math.sin(az),
      Math.sin(el),
      -Math.cos(el) * Math.cos(az)
    ]
    const night = (this.sceneId === 'night' || p.sunElevation < -2) ? 1 : 0

    const { yaw, pitch, dist, target } = this.camera
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    // orbit eye: pitch>0 = 俯瞰 (目標を上から見下ろす)。look 方向は
    // (sy·cp, −sp, −cy·cp) なので eye はその逆方向に置く。
    // (旧実装は eye = target + dist·fwd で目標の「後ろ側」→シーンと逆向き)
    const eye = [
      target[0] - dist * Math.sin(yaw) * cp,
      target[1] + dist * sp,
      target[2] + dist * Math.cos(yaw) * cp
    ]
    const aspect = this.canvas.width / Math.max(1, this.canvas.height)
    const near = 0.1, far = 400
    const proj = mat4Perspective(Math.PI / 3, aspect, near, far)
    this.viewProj = mat4Mul(proj, mat4View(eye, yaw, -pitch))

    // bloxdPackInputs (64B): seconds@0 lit@4 renderOffset@16 sunDirection@32 eyePosition@48
    {
      const d = new DataView(this.packInputsData)
      d.setFloat32(0, seconds, true)
      d.setUint32(4, p.lit ? 1 : 0, true)
      d.setInt32(16, 0, true); d.setInt32(20, 0, true); d.setInt32(24, 0, true)
      d.setFloat32(32, sun[0], true); d.setFloat32(36, sun[1], true); d.setFloat32(40, sun[2], true)
      d.setFloat32(48, eye[0], true); d.setFloat32(52, eye[1], true); d.setFloat32(56, eye[2], true)
      this.device.queue.writeBuffer(this.packInputsBuf, 0, this.packInputsData)
    }
    // view uniform (vec4 並び 272B)
    {
      const f = new Float32Array(this.viewData)
      f.set(this.viewProj, 0)
      f.set([eye[0], eye[1], eye[2], 0], 16)
      f.set([near, far, this.canvas.width, this.canvas.height], 20)
      f.set([sun[0], sun[1], sun[2], 0], 24)
      // 夜は ambient を底上げ (月光相当) して地形が潰れないようにする
      const ambient = night ? 0.38 : p.ambient * 0.35
      f.set([ambient, ambient, ambient, 0], 28)
      f.set([p.diffuse, p.diffuse, p.diffuse, 0], 32)
      const alc = night ? [0.10, 0.12, 0.18] : [0.38, 0.42, 0.48]
      f.set([...alc, 0], 36)
      const slc = night ? [0.32, 0.38, 0.55] : [1.0, 0.97, 0.90]
      f.set([...slc, 0], 40)
      const hl = p.heldLight
      f.set([hl * 0.95, hl * 0.85, hl * 0.65, 0], 44)
      const D = p.fogDistance
      const fogStart = D === 0 ? 0 : 32 * D
      const fogEnd = D === 0 ? 5 : 32 * (D + 1)
      f.set([fogStart, fogEnd, 0, 0], 48)
      // フォグ色は地平線の空色に合わせる (ワールドの縁を柔らかく溶かす)
      const fogC = night ? [0.08, 0.11, 0.21] : [0.66, 0.78, 0.91]
      f.set([...fogC, 0], 52)
      f.set([0.62, 0.42, 1.0, 1.4], 56) // enchantRGB + speed
      const u = new Uint32Array(this.viewData)
      u[60] = p.enchantTier
      u[61] = p.overlayOn ? 1 : 0
      f.set([0.85, 0.12, 0.10, 0.35], 64) // overlay rgba
      this.device.queue.writeBuffer(this.viewBuf, 0, this.viewData)
    }
    // skybox uniform (128B)
    {
      const f = new Float32Array(32)
      f.set(mat4InvViewNoTrans(yaw, -pitch), 0)
      const tanY = Math.tan(Math.PI / 6)
      f.set([tanY * aspect, tanY, 0, 0], 16)
      f.set([sun[0], sun[1], sun[2], 0], 20)
      const seconds = performance.now() / 1000 - this.startSeconds
      f.set([night, seconds % 3600, 0, 0], 24)
      const fogC = night ? [0.08, 0.11, 0.21] : [0.66, 0.78, 0.91]
      f.set([...fogC, 0], 28)
      this.device.queue.writeBuffer(this.skyBuf, 0, f)
    }
  }

  _updateAnimLayers() {
    const seconds = performance.now() / 1000 - this.startSeconds
    const bucket = Math.floor(seconds / 0.25)
    if (bucket === this._lastAnimBucket) return
    this._lastAnimBucket = bucket
    const layers = this._animScratch
    for (const L of this.animLadders) {
      layers[L.id] = L.rootLayer + (bucket % L.frames)
    }
    this.device.queue.writeBuffer(this.layersBuf, 0, layers)
  }

  // ---- ループ ----
  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop)
      this.render()
    }
    this._raf = requestAnimationFrame(loop)
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
  }

  render() {
    if (!this.ready || !this.pipelines) return
    this._ensureDepthTexture()
    this._updateUniforms()
    this._updateAnimLayers()

    const view = this.ctx.getCurrentTexture().createView()
    const encoder = this.device.createCommandEncoder()

    // 1) skybox (depth write off)
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
        depthStencilAttachment: { view: this.depthView, depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store' }
      })
      pass.setPipeline(this.skyPipeline)
      pass.setBindGroup(0, this.skyBind)
      pass.draw(3)
      pass.end()
    }
    // 2) terrain / model (opaque)
    for (const program of ['terrain', 'model']) {
      const p = this.pipelines[program]
      const mesh = this.meshes?.[program]
      if (!p?.pipeline || !mesh) continue
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view, loadOp: 'load', storeOp: 'store' }],
        depthStencilAttachment: { view: this.depthView, depthLoadOp: 'load', depthStoreOp: 'store' }
      })
      pass.setPipeline(p.pipeline)
      pass.setBindGroup(0, this.bg0)
      pass.setBindGroup(1, this.bg3)
      pass.setVertexBuffer(0, mesh.vbuf)
      pass.setIndexBuffer(mesh.ibuf, 'uint32')
      pass.drawIndexed(mesh.count)
      pass.end()
    }
    // 3) liquid (blend + depth test)
    {
      const p = this.pipelines.liquid
      const mesh = this.meshes?.liquid
      if (p?.pipeline && mesh) {
        // 深度をサンプリング用コピーへ (attachment と binding の同時使用を回避)
        if (this.depthCopyTex) {
          encoder.copyTextureToTexture(
            { texture: this.depthTex },
            { texture: this.depthCopyTex },
            [this.canvas.width, this.canvas.height]
          )
        }
        const pass = encoder.beginRenderPass({
          colorAttachments: [{ view, loadOp: 'load', storeOp: 'store' }],
          depthStencilAttachment: { view: this.depthView, depthLoadOp: 'load', depthStoreOp: 'store' }
        })
        pass.setPipeline(p.pipeline)
        pass.setBindGroup(0, this.bg0)
        pass.setBindGroup(1, this.bg3)
        pass.setVertexBuffer(0, mesh.vbuf)
        pass.setIndexBuffer(mesh.ibuf, 'uint32')
        pass.drawIndexed(mesh.count)
        pass.end()
      }
    }
    this.device.queue.submit([encoder.finish()])
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(320, Math.round(rect.width * dpr))
    const h = Math.max(240, Math.round(rect.height * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  destroy() {
    this.stop()
    try { this.device?.destroy?.() } catch { /* noop */ }
  }
}
