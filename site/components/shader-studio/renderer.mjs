// Shader Studio レンダラー: WebGPU 初期化・実アトラス構築・6バリアントの
// パイプライン管理・レンダーループ。シェーダー生成は shader-gen.mjs、
// シーンは scenes.mjs、テクスチャは textures.mjs。
//
// アトラスは本番 bloxd.io (v98qt8) の実データ: 8x8 タイル 1227 枚を
// texture_2d_array へ (本番 Lite レンダラーと同一の積み上げ方)。
// 空は本番が使う Babylon SkyMaterial (Preetham 散乱) を WGSL に 1:1 移植 —
// パラメータも本番値 (turbidity 10 / rayleigh 2 / mieCoefficient 0.005 /
// mieDirectionalG 0.8 / luminance 1)。

import { makeShaderSource } from './shader-gen.mjs'
import { buildAtlasPixels, buildMips, animLadderInfo, ATLAS_TILE, ATLAS_LAYERS, ATLAS_STRIPS } from './textures.mjs'
import { buildMeshes, SCENES } from './scenes.mjs'

const FLOATS_PER_VERTEX = 21 // 84B (scenes.mjs の 1 頂点 21 float と一致)
const MIP_LEVELS = 4         // 8, 4, 2, 1
const ATLAS_STRIP_LAYERS = 256  // 5 ストリップ × 256 層 (本番 imagesPerAtlas 構成)

// ------------------------------------------------------------ skybox ----
// Babylon.js SkyMaterial (Preetham) の WGSL 移植。 uniforms は本番ローダーが
// 流し込むものと同じ名前/意味 (sunPosition は距離付きワールド座標、
// sunfade が日没を駆動する)。
const SKYBOX_WGSL = /* wgsl */`
struct SkyUniforms {
  invRot: mat4x4f,        // カメラ回転の逆 (yaw/pitch)
  tanHalf: vec4f,         // tan(fov/2)*aspect, tan(fov/2), 0, 0
  sunPosition: vec4f,     // xyz = sunDirection * 450000 (本番と同じ距離)
  params: vec4f,          // luminance, turbidity, rayleigh, mieCoefficient
  params2: vec4f,         // mieDirectionalG, cloudiness, night, moonBlend
  fogColour: vec4f,       // xyz (地平線下のフォグ混色用)
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

// ---- Preetham 定数 (Babylon skyMaterial.fragment.fx から 1:1) ----
const PI: f32 = 3.141592653589793238462643383279502884197169;
const n_air: f32 = 1.0003;
const N_mol: f32 = 2.545E25;
const pn: f32 = 0.035;
const lambda: vec3f = vec3f(680E-9, 550E-9, 450E-9);
const K_mie: vec3f = vec3f(0.686, 0.678, 0.666);
const v_mie: f32 = 4.0;
const rayleighZenithLength: f32 = 8.4E3;
const mieZenithLength: f32 = 1.25E3;
const EE: f32 = 1000.0;
const sunAngularDiameterCos: f32 = 0.999956676946448443553574619906976;
const cutoffAngle: f32 = PI / 1.95;
const steepness: f32 = 1.5;
// 雲モデル定数 (本番と同一: Frostbite 系 dual-lobe HG)
const CLOUD_TAU_MAX: f32 = 15.0;
const CLOUD_G: f32 = 0.5;
const CLOUD_G_BACK: f32 = -0.5;
const CLOUD_BACK_WEIGHT: f32 = 0.2;

fn simplifiedRayleigh() -> vec3f {
  return 0.0005 / vec3f(94.0, 40.0, 18.0);
}
fn rayleighPhase(cosTheta: f32) -> f32 {
  return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}
fn totalMie(T: f32) -> vec3f {
  let c = (0.2 * T) * 10E-18;
  return 0.434 * c * PI * pow((2.0 * PI) / lambda, vec3f(v_mie - 2.0)) * K_mie;
}
fn hgPhase(cosTheta: f32, g: f32) -> f32 {
  return (1.0 / (4.0 * PI)) * ((1.0 - g * g) / pow(1.0 - 2.0 * g * cosTheta + g * g, 1.5));
}
fn cloudPhase(cosTheta: f32, gForward: f32) -> f32 {
  return mix(hgPhase(cosTheta, gForward), hgPhase(cosTheta, CLOUD_G_BACK), CLOUD_BACK_WEIGHT);
}
fn sunIntensity(zenithAngleCos: f32) -> f32 {
  return EE * max(0.0, 1.0 - exp((-(cutoffAngle - acos(zenithAngleCos)) / steepness)));
}
// Uncharted2 tonemap (本番 #ifndef SKY_RAW_HDR_OUTPUT 経路)
fn u2tonemap(x: vec3f) -> vec3f {
  let A = 0.15; let B = 0.50; let C = 0.10; let D = 0.20; let EEE = 0.02; let F = 0.30;
  return ((x * (A * x + C * B) + D * EEE) / (x * (A * x + B) + D * F)) - EEE / F;
}

@fragment
fn fsMain(in: VOut) -> @location(0) vec4f {
  let up = vec3f(0.0, 1.0, 0.0);
  let luminance = sky.params.x;
  let turbidity = sky.params.y;
  let rayleigh = sky.params.z;
  let mieCoefficient = sky.params.w;
  let mieDirectionalG = sky.params2.x;
  let cloudiness = sky.params2.y;
  let night = sky.params2.z;
  let moonBlend = sky.params2.w;

  let direction = normalize(in.dir);
  // 本番: vPositionW - cameraPosition (+ cameraOffset) → 視線方向
  let sunPosition = sky.sunPosition.xyz;

  // ---- Babylon skyMaterial main() の本体 ----
  let sunfade = 1.0 - clamp(1.0 - exp(sunPosition.y / 450000.0), 0.0, 1.0);
  let rayleighCoefficient = rayleigh - (1.0 * (1.0 - sunfade));
  let sunDirection = normalize(sunPosition);
  let sunE = sunIntensity(dot(sunDirection, up));
  let betaR = simplifiedRayleigh() * rayleighCoefficient;
  let betaM = totalMie(turbidity) * mieCoefficient;
  let zenithAngle = acos(max(0.0, dot(up, direction)));
  let denom = cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / PI), -1.253);
  let sR = rayleighZenithLength / denom;
  let sM = mieZenithLength / denom;
  let Fex = exp(-(betaR * sR + betaM * sM));
  let cosTheta = dot(direction, sunDirection);
  let rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
  let betaRTheta = betaR * rPhase;
  let mPhase = hgPhase(cosTheta, mieDirectionalG);
  let betaMTheta = betaM * mPhase;

  var Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3f(1.5));
  Lin *= mix(vec3f(1.0),
    pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3f(1.0 / 2.0)),
    clamp(pow(1.0 - dot(up, sunDirection), 5.0), 0.0, 1.0));

  var L0 = vec3f(0.1) * Fex;
  // 太陽円盤 (雲は本番の物理モデル: Beer-Lambert + dual-lobe HG)
  var sundiskTerm: f32;
  if (cloudiness > 0.0) {
    let cloudTau = cloudiness * CLOUD_TAU_MAX;
    let cloudT = exp(-cloudTau);
    let cloudG = CLOUD_G * cloudT;
    let omegaSun = 2.0 * PI * (1.0 - sunAngularDiameterCos);
    let sharpDisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
    sundiskTerm = cloudT * sharpDisk + (1.0 - cloudT) * omegaSun * cloudPhase(cosTheta, cloudG);
  } else {
    sundiskTerm = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
  }
  L0 += (sunE * 19000.0 * Fex) * sundiskTerm;

  // 月 (本番は別メッシュ — studio は太陽の反対に控えめな円盤。夜だけ)
  if (moonBlend > 0.0) {
    let moonDir = -sunDirection;
    let cosM = dot(direction, moonDir);
    let moonDisk = smoothstep(0.99955, 0.99965, cosM);
    L0 += vec3f(0.9, 0.95, 1.05) * moonDisk * moonBlend;
  }

  var texColor = (Lin + L0);
  texColor *= 0.04;
  texColor += vec3f(0.0, 0.001, 0.0025) * 0.3;

  let whiteScale = 1.0 / u2tonemap(vec3f(1000.0));
  let fLumScaled = 0.1 / luminance;
  let fLumCompressed = (fLumScaled * (1.0 + (fLumScaled / 1.0))) / (1.0 + fLumScaled);
  let curr = u2tonemap((log2(2.0 / pow(luminance, 4.0))) * texColor);
  var retColor = curr * whiteScale;

  // 地平線下は本番同様フォグ色へ (Babylon fogFragment と同じ役割)
  if (direction.y < 0.0) {
    retColor = mix(retColor, sky.fogColour.xyz, saturate(-direction.y * 3.0));
  }
  // 夜シーンでは月灯りぶん底上げしすぎない程度的な補正 (演出、本番相当は
  // シーン側 lighting が担う)
  retColor = mix(retColor, retColor * vec3f(0.35, 0.45, 0.75) + vec3f(0.004, 0.006, 0.014), night);

  return vec4f(clamp(retColor, vec3f(0.0), vec3f(1.0)), 1.0);
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
      overlayOn: false, cloudiness: 0
    }
    // カメラ: fps = 本番の一人称 (ポインタロック + WASD + 重力)。
    // orbit = 従来の俯瞰 (プレビュー演出用)。
    this.camera = {
      mode: 'fps',
      yaw: -0.15, pitch: 0.0,
      dist: 24, target: [0, 3, 0],
      pos: [0, 5, 0], vel: [0, 0, 0], onGround: false,
      eyeHeight: 1.62, speed: 4.3, sprint: 1.6
    }
    this.input = { keys: new Set(), wantJump: false, pointerLocked: false }
    this._lastFrame = 0
    this.startSeconds = performance.now() / 1000
    this._raf = null
    this._pendingCompile = []
    this._animPhase = null
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser. Use Chrome/Edge 113+, Firefox 141+, or Safari 26+.')
    }
    this.adapter = await navigator.gpu.requestAdapter()
    if (!this.adapter) throw new Error('WebGPU adapter unavailable')
    // アトラスは本番と同じ 5 構成 (5 × ≤256 層) に分割してバインドするため、
    // maxTextureArrayLayers は既定下限 256 で足りる — requiredLimits の要求も不要。
    // (単一 1240 層配列だと 256 が上限のアダプターで GPU パスが立たない)
    const adapterMaxLayers = this.adapter.limits?.maxTextureArrayLayers ?? 256
    if (adapterMaxLayers < ATLAS_STRIP_LAYERS) {
      throw new Error(
        `GPU texture array limit too small: adapter supports ${adapterMaxLayers} layers, each atlas strip needs ${ATLAS_STRIP_LAYERS}.`
      )
    }
    this.device = await this.adapter.requestDevice()
    this.ctx = this.canvas.getContext('webgpu')
    this.format = navigator.gpu.getPreferredCanvasFormat()
    this.ctx.configure({ device: this.device, format: this.format, alphaMode: 'opaque' })

    await this._buildAtlas()
    this._buildUniforms()
    this._buildSkybox()
    this.setScene(this.sceneId, this._pendingSceneExtra || {})
    this.ready = true
    this._recompile()
  }

  // ---- アトラス: 本番と同じ 5 構成 (5 × 256 層 × 8x8 × 4 mip) ----
  async _buildAtlas() {
    const pixels = await buildAtlasPixels()      // fetch + decodeImage + getImageData
    const mips = buildMips(pixels)
    const sizes = [ATLAS_TILE, ATLAS_TILE / 2, ATLAS_TILE / 4, ATLAS_TILE / 8]
    // 5 枚 × 256 層に分割 (imagesPerAtlas [256,256,256,256,203] 相当。
    // 論理層 1240 ≤ 5×256=1280。残りは余白)
    this.atlasTexs = []
    for (let s = 0; s < ATLAS_STRIPS; s++) {
      const tex = this.device.createTexture({
        size: [ATLAS_TILE, ATLAS_TILE, ATLAS_STRIP_LAYERS],
        dimension: '2d',
        format: 'rgba8unorm',
        mipLevelCount: MIP_LEVELS,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      })
      for (let m = 0; m < MIP_LEVELS; m++) {
        const mip = mips[m]
        const sz = sizes[m]
        const layerSize = sz * sz * 4
        // 全層を一括 write (bytesPerRow はレイヤー行 × 4、rowsPerImage=1 レイヤー分)
        // → 5 ストリップ分だけ切り出して書く
        const strip = new Uint8ClampedArray(ATLAS_STRIP_LAYERS * layerSize)
        const srcBase = s * ATLAS_STRIP_LAYERS * layerSize
        strip.set(mip.subarray(srcBase, srcBase + strip.length))
        this.device.queue.writeTexture(
          { texture: tex, mipLevel: m },
          strip,
          { bytesPerRow: sz * 4, rowsPerImage: sz },
          [sz, sz, ATLAS_STRIP_LAYERS]
        )
      }
      this.atlasTexs.push(tex)
    }
    this.atlasSampler = this.device.createSampler({ magFilter: 'nearest', minFilter: 'nearest', addressModeU: 'repeat', addressModeV: 'repeat' })

    // bloxdSpTextureLayers: id → 論理層 (0..1239)。恒等写像 (layer = id-1)。
    // anim 族は registry の frames (本番の状態列) を interval ごとに巡回。
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
    // skybox uniform: 160B (mat4 + 4 x vec4)
    this.skyBuf = this.device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
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
    // 衝突判定用にブロック表を保持 (一人称移動)。液体は通過可。
    this._collidable = this.scene.builder.solidBlocks
    this._liquidAt = (x, y, z) => this.scene.builder.blocks.get(x + ',' + y + ',' + z) === 'water'
    // カメラ初期化: fps はシーンのスポーン位置へ
    const c = this.camera
    const sp = this.scene.fpSpawn
    if (sp) {
      c.pos = [sp[0], sp[1], sp[2]]
      c.vel = [0, 0, 0]
      c.yaw = this.scene.fpYaw ?? 0
      c.pitch = this.scene.fpPitch ?? 0.05
    }
    c.yaw = this.scene.lookYaw ?? c.yaw
    c.pitch = this.scene.lookPitch ?? 0.3
    c.dist = this.scene.camDist ?? (this.scene.camera ? Math.hypot(...this.scene.camera) * 0.55 : 24)
    c.target = this.scene.camTarget ?? [0, this.sceneId === 'cave' ? -3 : 3, 0]
    if (sceneId === 'night') this.params.sunElevation = -12
    else if (this.params.sunElevation < 0) this.params.sunElevation = 54
    return true
  }

  setCameraMode(mode) {
    this.camera.mode = mode === 'orbit' ? 'orbit' : 'fps'
    if (this.camera.mode === 'fps' && this.scene?.fpSpawn) {
      const sp = this.scene.fpSpawn
      this.camera.pos = [sp[0], sp[1], sp[2]]
      this.camera.vel = [0, 0, 0]
    }
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
      let info = null
      try {
        // SwiftShader 系では getCompilationInfo がインスタンスごと落とすことが
        // ある — 提出済みフレームには影響しないので諦めて続行する
        info = await Promise.race([
          module.getCompilationInfo(),
          new Promise(res => setTimeout(() => res(null), 400))
        ])
      } catch (e) { continue }
      if (!info) continue
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
    // group(0): 0 view uniform / 1..5 atlas arrays / 6 sampler
    const entries0 = [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }
    ]
    for (let i = 0; i < ATLAS_STRIPS; i++) {
      entries0.push({ binding: 1 + i, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d-array' } })
    }
    entries0.push({ binding: 6, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } })
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
    // GPUBindGroupLayout は .entries を公開しない (旧実装はここで落ちていた) —
    // 深度バインド (liquid 専用) の有無は自前で記録する
    this.bgl3HasDepth = entries3.length > 2
    // シェーダーは @group(3) (エンジンと同じ番号) を使うため、パイプライン
    // レイアウトは 4 スロット必要 (group 1,2 は空レイアウトで埋める)。
    // 旧実装は [bgl0, bgl3] = group(1) に置いており、常に検証エラーになっていた。
    this.bglEmpty = this.device.createBindGroupLayout({ entries: [] })

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
          layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bglEmpty, this.bglEmpty, this.bgl3] }),
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
    const e0 = [
      { binding: 0, resource: { buffer: this.viewBuf } }
    ]
    for (let i = 0; i < ATLAS_STRIPS; i++) {
      e0.push({ binding: 1 + i, resource: this.atlasTexs[i].createView({ dimension: '2d-array' }) })
    }
    e0.push({ binding: 6, resource: this.atlasSampler })
    this.bg0 = this.device.createBindGroup({ layout: this.bgl0, entries: e0 })
    const e3 = [
      { binding: 0, resource: { buffer: this.packInputsBuf } },
      { binding: 2, resource: { buffer: this.layersBuf } }
    ]
    if (this.bgl3HasDepth && this.depthCopyView) {
      e3.push({ binding: 1, resource: this.depthCopyView })
      e3.push({ binding: 3, resource: this.depthSampler })
    }
    this.bg3 = this.device.createBindGroup({ layout: this.bgl3, entries: e3 })
  }

  // ---- 一人称移動 (本番の歩行相当: AABB 衝突 + 重力 + ジャンプ) ----
  _solidAt(x, y, z) {
    if (!this._collidable) return false
    return this._collidable.has(x + ',' + y + ',' + z)
  }

  _stepFps(dt) {
    const c = this.camera
    const k = this.input.keys
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight') ? c.sprint : 1
    const speed = c.speed * sprint
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw)
    // 前進方向 (水平成分のみ — 本番の歩行と同じ)
    const fwd = [sy, 0, -cy]
    const right = [cy, 0, sy]
    let mx = 0, mz = 0
    if (k.has('KeyW')) { mx += fwd[0]; mz += fwd[2] }
    if (k.has('KeyS')) { mx -= fwd[0]; mz -= fwd[2] }
    if (k.has('KeyD')) { mx += right[0]; mz += right[2] }
    if (k.has('KeyA')) { mx -= right[0]; mz -= right[2] }
    const ml = Math.hypot(mx, mz) || 1
    mx = mx / ml * speed; mz = mz / ml * speed
    // 空中操作は本番同様控えめ
    if (!c.onGround) { mx *= 0.35; mz *= 0.35 }
    c.vel[0] = mx
    c.vel[2] = mz
    if (this.input.wantJump && c.onGround) {
      c.vel[1] = 8.2
      c.onGround = false
    }
    this.input.wantJump = false
    c.vel[1] -= 25 * dt
    if (c.vel[1] < -40) c.vel[1] = -40

    // AABB (0.6 x 1.8) の軸別衝突解決 (軸ごとに移動→衝突なら戻す)
    const R = 0.3
    const pos = c.pos
    const boxCollides = (p) => {
      const feet = p[1] - c.eyeHeight
      const y0 = Math.floor(feet + 0.001), y1 = Math.floor(feet + 1.799)
      const x0 = Math.floor(p[0] - R), x1 = Math.floor(p[0] + R)
      const z0 = Math.floor(p[2] - R), z1 = Math.floor(p[2] + R)
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          for (let zz = z0; zz <= z1; zz++) {
            if (this._liquidAt && this._liquidAt(xx, yy, zz)) continue
            if (this._solidAt(xx, yy, zz)) return true
          }
        }
      }
      return false
    }
    const move = (axis, delta) => {
      if (delta === 0) return
      const old = pos[axis]
      pos[axis] = old + delta
      if (boxCollides(pos)) {
        pos[axis] = old   // 壁/床/天井 → 移動取消 (軸別 = 壁ずり・着地が自然)
        if (axis === 1) {
          if (delta < 0) c.onGround = true
          c.vel[1] = 0
        }
      }
    }
    c.onGround = false
    move(0, c.vel[0] * dt)
    move(2, c.vel[2] * dt)
    move(1, c.vel[1] * dt)
    // ワールド外落下の保険
    if (pos[1] < -40) {
      const sp = this.scene?.fpSpawn
      if (sp) { pos[0] = sp[0]; pos[1] = sp[1]; pos[2] = sp[2]; c.vel = [0, 0, 0] }
    }
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

    const c = this.camera
    let eye
    const aspect = this.canvas.width / Math.max(1, this.canvas.height)
    const near = 0.1, far = 400
    if (c.mode === 'fps') {
      eye = [c.pos[0], c.pos[1], c.pos[2]]
      this.viewProj = mat4Mul(mat4Perspective(Math.PI / 3, aspect, near, far), mat4View(eye, c.yaw, c.pitch))
    } else {
      const { yaw, pitch, dist, target } = c
      const cp = Math.cos(pitch), sp = Math.sin(pitch)
      eye = [
        target[0] - dist * Math.sin(yaw) * cp,
        target[1] + dist * sp,
        target[2] + dist * Math.cos(yaw) * cp
      ]
      this.viewProj = mat4Mul(mat4Perspective(Math.PI / 3, aspect, near, far), mat4View(eye, yaw, -pitch))
    }

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
      // フォグ色は空の地平線色に合わせる (Preetham の地平線出力に寄せる)
      const fogC = night ? [0.04, 0.05, 0.09] : [0.62, 0.72, 0.85]
      f.set([...fogC, 0], 52)
      f.set([0.62, 0.42, 1.0, 1.4], 56) // enchantRGB + speed
      const u = new Uint32Array(this.viewData)
      u[60] = p.enchantTier
      u[61] = p.overlayOn ? 1 : 0
      f.set([0.85, 0.12, 0.10, 0.35], 64) // overlay rgba
      this.device.queue.writeBuffer(this.viewBuf, 0, this.viewData)
    }
    // skybox uniform (160B) — Preetham。本番値: turbidity 10 / rayleigh 2 /
    // mieCoefficient 0.005 / mieDirectionalG 0.8 / luminance 1。
    {
      const f = new Float32Array(40)
      f.set(mat4InvViewNoTrans(c.yaw, c.mode === 'fps' ? c.pitch : -c.pitch), 0)
      const tanY = Math.tan(Math.PI / 6)
      f.set([tanY * aspect, tanY, 0, 0], 16)
      // sunPosition = 方向 × 450000 (本番 sunfade の距離定数)
      f.set([sun[0] * 450000, sun[1] * 450000, sun[2] * 450000, 0], 20)
      const lum = night ? 0.9 : 1.0
      f.set([lum, 10.0, 2.0, 0.005], 24)                       // luminance, turbidity, rayleigh, mieCoefficient
      const moonBlend = night ? 1 : 0
      f.set([0.8, p.cloudiness || 0, night, moonBlend], 28)     // mieDirectionalG, cloudiness, night, moonBlend
      const fogC = night ? [0.04, 0.05, 0.09] : [0.62, 0.72, 0.85]
      f.set([...fogC, 0], 32)
      this.device.queue.writeBuffer(this.skyBuf, 0, f)
    }
  }

  _updateAnimLayers() {
    const seconds = performance.now() / 1000 - this.startSeconds
    // 本番は族ごとの interval (lava 200ms / portal 300ms) でフレームを進める
    if (this._animBuckets === undefined) this._animBuckets = new Map()
    let dirty = false
    const layers = this._animScratch
    for (const L of this.animLadders) {
      const bucket = Math.floor(seconds * 1000 / (L.interval || 200))
      if (this._animBuckets.get(L.id) === bucket) continue
      this._animBuckets.set(L.id, bucket)
      const n = L.frameLayers.length
      layers[L.id] = L.frameLayers[bucket % n]
      dirty = true
    }
    if (dirty) this.device.queue.writeBuffer(this.layersBuf, 0, layers)
  }

  // ---- ループ ----
  start() {
    const loop = (t) => {
      this._raf = requestAnimationFrame(loop)
      const dt = this._lastFrame ? Math.min(0.05, (t - this._lastFrame) / 1000) : 0.016
      this._lastFrame = t
      if (this.camera.mode === 'fps' && this.ready && !this.params.paused) this._stepFps(dt)
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
      pass.setBindGroup(3, this.bg3)
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
        pass.setBindGroup(3, this.bg3)
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
