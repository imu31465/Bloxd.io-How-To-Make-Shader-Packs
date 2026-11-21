// Shader Studio シェーダー生成。
// エンジンの実測仕様 (docs-repo: internals/*) に忠実:
//   - bloxdPackInputs uniform: @group(3) @binding(0), 64B
//     (seconds@0, lit@4 u32, renderOffset@16 vec3i, sunDirection@32, eyePosition@48)
//   - group3: 0 uniform / 1 scene depth (liquidのみ) / 2 bloxdSpTextureLayers storage
//   - 6バリアント: strict|allow × terrain|liquid|model (マクロ行列は docs通り)
//   - bloxdTexel は atlas path (バリアント2) を verbatim 実装:
//     回転 if-chain はエンジン生成コードと同一、現在フラグメントの
//     textureRotation (= bloxdSpTextureRotation) は private var 経由
//   - litColour は fog 直前キャプチャ (エンジンの splice 位置と同じ)
//   - strict terrain の surface alpha は書き戻されない (graft 無しと同じ)
//   - 2-light directional (main=sun 1.0 + fill=[-0.5,-1,-1] 0.45)
//   - linear fog: fogStart=32D, fogEnd=32(D+1), 色 rgb(183,191,195)
//   - lift curve 1-(1-x/(3-2x))^3 と blockLight の35%フロア

import { preprocessWgsl } from './preprocess.mjs'
import { registry, ATLAS_LAYERS } from './textures.mjs'
import ENGINE_HEADER from './engine-header.mjs'

// bloxdTextureId* 名前付き定数群 (docs: api/texture-api.md)。エンジンと同じ
// 生成規則 — テクスチャ名を非英数字の連続で分割し各部分を頭文字大文字化して連結。
// 大小文字・アンダースコアの畳み込み照合はエンジン側機能のため、ここでは生成された
// 綴りそのまま (studio では正規 CamelCase を推奨)。
export function makeTextureIdConstants() {
  const seen = new Set()
  const out = []
  for (const { name, id } of registry.names) {
    const cname = 'bloxdTextureId' + name
      .split(/[^a-zA-Z0-9]+/).filter(Boolean)
      .map(p => p[0].toUpperCase() + p.slice(1)).join('')
    if (seen.has(cname)) continue // 畳み込み後の重複 (エンジンでは曖昧エラー)
    seen.add(cname)
    out.push(`const ${cname}: u32 = ${id}u;`)
  }
  return out.join('\n')
}

// bloxdFragmentBlockPosition — v5 ヘッダーからは外れたがエンジンが今も注入する
// 非公開関数 (docs: api/functions.md)。地形/液体の定義を全プログラムに適用
// (モデル版の 1/64 スナップ変種は未公開のため同一式で近似)。
export const FRAGMENT_BLOCK_POSITION_WGSL = /* wgsl */`
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}
`

export function makeVariantMacros(program, strict) {
  const macros = []
  if (strict) macros.push('BLOXD_STRICT')
  if (program === 'liquid' || !strict) macros.push('BLOXD_ALPHA')
  if (program === 'liquid') macros.push('BLOXD_SCENE_DEPTH')
  return macros
}

export function detectHooks(userCode, program) {
  const cap = program === 'terrain' ? 'Terrain' : program === 'liquid' ? 'Liquid' : 'Model'
  const re = n => new RegExp('\\bfn\\s+bloxd' + cap + n + '\\s*\\(')
  return {
    vertex: re('Vertex').test(userCode),
    surface: re('Surface').test(userCode),
    light: re('Light').test(userCode)
  }
}

export function makeShaderSource(userCode, program, strict) {
  const macros = makeVariantMacros(program, strict)
  const header = preprocessWgsl(ENGINE_HEADER, macros)
  const user = preprocessWgsl(userCode, macros)
  if (header.errors.length || user.errors.length) {
    return { errors: [...header.errors, ...user.errors], errorsWhere: 'preprocess' }
  }
  const has = detectHooks(user.code, program)
  const cap = program === 'terrain' ? 'Terrain' : program === 'liquid' ? 'Liquid' : 'Model'
  const hookVertex = 'bloxd' + cap + 'Vertex'
  const hookSurface = 'bloxd' + cap + 'Surface'
  const hookLight = 'bloxd' + cap + 'Light'

  const isLiquid = program === 'liquid'
  const isModel = program === 'model'
  // strict では vertex フックは「定義自体がエラー」(validator が担う)。ここでは
  // 呼び出しを注入しない (= エンジンが strict variant で vertex を実行しないのと同じ)。
  const useVertexHook = has.vertex && !strict

  // ------------------------------------------------ common declarations ---
  const common = /* wgsl */`
struct BloxdPackInputs {
  seconds: f32,            // @offset(0)
  lit: u32,                // @offset(4)
  _pad0: u32, _pad1: u32,
  renderOffset: vec3i,     // @offset(16)
  _pad2: u32,
  sunDirection: vec3f,     // @offset(32)
  _pad3: f32,
  eyePosition: vec3f,      // @offset(48)
};
@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs;
@group(3) @binding(2) var<storage, read> bloxdSpTextureLayers: array<u32>;
${isLiquid ? `@group(3) @binding(1) var sceneDepth: texture_depth_2d;
@group(3) @binding(3) var sceneDepthSampler: sampler;` : ''}

struct ViewUniforms {
  viewProj: mat4x4f,
  eye: vec4f,                // xyz = eye
  nearFarViewport: vec4f,    // near, far, width, height
  sunDirection: vec4f,       // xyz = sun
  ambient: vec4f,            // xyz = material.ambient × sceneAmbient
  diffuse: vec4f,            // xyz = 材質のdirectional応答
  ambientLightColour: vec4f, // xyz
  skyLightColour: vec4f,     // xyz
  heldLight: vec4f,          // xyz
  fogParams: vec4f,          // xy = fogStart, fogEnd
  fogColour: vec4f,          // xyz
  enchantRGB: vec4f,         // xyz = enchant rgb, w = speed
  enchantTierOverlay: vec4u, // x = tier, y = overlayOn
  overlay: vec4f,            // xyz = rgb, w = alpha
};
@group(0) @binding(0) var<uniform> view: ViewUniforms;
// アトラスは本番と同じ 5 構成 (imagesPerAtlas [256,256,256,256,203]) —
// maxTextureArrayLayers の既定下限 256 に合わせ、5 枚 × ≤256 層の
// texture_2d_array に分割してバインドする (どのアダプターでも GPU パスが動く)。
@group(0) @binding(1) var textureAtlas0: texture_2d_array<f32>;
@group(0) @binding(2) var textureAtlas1: texture_2d_array<f32>;
@group(0) @binding(3) var textureAtlas2: texture_2d_array<f32>;
@group(0) @binding(4) var textureAtlas3: texture_2d_array<f32>;
@group(0) @binding(5) var textureAtlas4: texture_2d_array<f32>;
@group(0) @binding(6) var textureAtlasSampler: sampler;

// ---- 現在フラグメント情報 (エンジンの bloxdSp* 一時変数の役割) ----
var<private> bloxdSpTextureRotation: u32;
var<private> bloxdSpFragPosition: vec3f;
var<private> bloxdSpScreenUV: vec2f;
var<private> bloxdSpFragDepth: f32;

// ---- 頂点入力 (mesher 相当: 12 float = 48B) ----
struct VertexIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) colourRaw: vec4f,     // 0-255 (tint×AO baked by mesher)
  @location(3) uv: vec2f,
  @location(4) atlasIndex: f32,
  @location(5) @interpolate(flat) textureId: u32,
  @location(6) @interpolate(flat) textureRotation: u32,
  @location(7) mipLevel: f32,
  @location(8) @interpolate(flat) flagsBits: u32,
  @location(9) @interpolate(flat) lightLevels: u32,   // r,g,b,sky nibbles
  @location(10) localPosition: vec3f,  // terrain/liquid は 0 (model のみ)
};

// vertex出力 = fragment入力 (@builtin(position) は fragment でも読める)
struct FragmentOut {
  @builtin(position) pos: vec4f,
  @location(0) vPosition: vec3f,
  @location(1) vNormal: vec3f,
  @location(2) vColour: vec4f,          // 正規化済 0-1
  @location(3) vUv: vec2f,
  @location(4) @interpolate(flat) vTextureId: u32,
  @location(5) @interpolate(flat) vTextureRotation: u32,
  @location(6) vMipLevel: f32,
  @location(7) @interpolate(flat) vFlagsBits: u32,
  @location(8) @interpolate(flat) vLightLevels: u32,
  @location(9) vLocalPosition: vec3f,
};

fn decodeFlags(bits: u32) -> BloxdFlags {
  return BloxdFlags(
    (bits & 1u) != 0u, ((bits >> 1u) & 1u) != 0u, ((bits >> 2u) & 1u) != 0u, ((bits >> 3u) & 1u) != 0u,
    ((bits >> 4u) & 1u) != 0u, ((bits >> 5u) & 1u) != 0u, ((bits >> 6u) & 1u) != 0u, ((bits >> 7u) & 1u) != 0u,
    ((bits >> 8u) & 1u) != 0u, ((bits >> 9u) & 1u) != 0u, ((bits >> 10u) & 1u) != 0u, ((bits >> 11u) & 1u) != 0u,
    ((bits >> 12u) & 1u) != 0u, ((bits >> 13u) & 1u) != 0u);
}

// lift curve: 光レベル (0-15) → 0-1 (エンジンと同一式)
fn bloxdSpLift(level: f32) -> f32 {
  let x = clamp(level / 15.0, 0.0, 1.0);
  return 1.0 - pow(1.0 - x / (3.0 - 2.0 * x), 3.0);
}

// ---- テクスチャ API 実装 (バリアント2: atlas path) ----
// bloxdTexel は textureId==0 で白を返す ("no texture")。
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
  return textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))));
}

fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
  var bloxdSpTurned = bloxdSpUv;
  if (bloxdSpTextureRotation == 1u) {
    bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
  } else if (bloxdSpTextureRotation == 2u) {
    bloxdSpTurned = 1.0 - bloxdSpUv;
  } else if (bloxdSpTextureRotation == 3u) {
    bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
  }
  if (bloxdSpTextureId == 0u || bloxdSpTextureId >= ${ATLAS_LAYERS + 1}u) {
    return vec4f(1.0);
  }
  let layer = bloxdSpTextureLayers[bloxdSpTextureId];
  // texture_2d_array 版のシグネチャは (t, s, coords, array_index: u32, level: f32)
  // — level は f32 で渡す (旧実装は u32 を渡しており GPU パスが常に壊れていた)
  let level = clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u));
  // 本番の 5 アトラス構成: スロット → (ストリップ, 行) への分割
  let strip = layer / 256u;
  let row = layer % 256u;
  if (strip == 0u) { return textureSampleLevel(textureAtlas0, textureAtlasSampler, bloxdSpTurned, row, level); }
  if (strip == 1u) { return textureSampleLevel(textureAtlas1, textureAtlasSampler, bloxdSpTurned, row, level); }
  if (strip == 2u) { return textureSampleLevel(textureAtlas2, textureAtlasSampler, bloxdSpTurned, row, level); }
  if (strip == 3u) { return textureSampleLevel(textureAtlas3, textureAtlasSampler, bloxdSpTurned, row, level); }
  return textureSampleLevel(textureAtlas4, textureAtlasSampler, bloxdSpTurned, row, level);
}

// ---- bloxdTextureId* 名前付き定数 (911名) + 非公開だが今も注入される
// bloxdFragmentBlockPosition (api/functions.md 参照) ----
${makeTextureIdConstants()}
${FRAGMENT_BLOCK_POSITION_WGSL}
`

  // ------------------------------------------------ runtime (hooks wiring) ---
  const runtime = /* wgsl */`
fn buildSurfaceIn(f: FragmentOut) -> BloxdSurfaceIn {
  var s: BloxdSurfaceIn;
  s.colour = f.vColour.rgb;
  s.alpha = f.vColour.a;
  ${isModel ? `let fl = decodeFlags(f.vFlagsBits);
  if (fl.held && view.enchantTierOverlay.x > 0u) {
    s.enchantTier = view.enchantTierOverlay.x;
    // エンジン同様、enchantColour.a はアニメーションされる (読むと動く)
    s.enchantColour = vec4f(view.enchantRGB.xyz, 0.30 + 0.25 * sin(bloxdPackInputs.seconds * view.enchantRGB.w));
    s.enchantSpeed = view.enchantRGB.w;
  }
  if (view.enchantTierOverlay.y != 0u && fl.lifeform) {
    s.overlayColour = view.overlay;
  }` : ''}
  s.position = f.vPosition;
  s.normal = f.vNormal;
  s.localPosition = f.vLocalPosition;
  s.flags = decodeFlags(f.vFlagsBits);
  s.textureId = f.vTextureId;
  s.textureRotation = f.vTextureRotation;
  s.uv = f.vUv;
  s.mipLevel = f.vMipLevel;
  return s;
}

fn buildLightIn(f: FragmentOut) -> BloxdLightIn {
  var l: BloxdLightIn;
  let flags = decodeFlags(f.vFlagsBits);
  let rLevel = f32((f.vLightLevels >> 24u) & 15u);
  let gLevel = f32((f.vLightLevels >> 20u) & 15u);
  let bLevel = f32((f.vLightLevels >> 16u) & 15u);
  let skyLevel = f32((f.vLightLevels >> 12u) & 15u);
  var blockLight = vec3f(bloxdSpLift(rLevel), bloxdSpLift(gLevel), bloxdSpLift(bLevel));
  // 35% フロア (エンジンはデコード時に各チャンネルを最も明るいRGBの35%で床上げ)
  let brightest = max(max(blockLight.r, blockLight.g), blockLight.b);
  blockLight = max(blockLight, vec3f(brightest * 0.35));
  var skyLight = bloxdSpLift(skyLevel);
  var ambientLightColour = view.ambientLightColour.xyz;
  var skyLightColour = view.skyLightColour.xyz;
  var heldLight = view.heldLight.xyz;
  if (!bloxdLit()) {
    blockLight = vec3f(0.0);
    heldLight = vec3f(0.0);
    skyLight = 1.0;
    ambientLightColour = vec3f(1.0);
    skyLightColour = vec3f(1.0);
  }
  l.litColour = vec3f(0.0);
  // 2-light Lambert: main (sun方向, 強度1.0) + fill ([-0.5,-1,-1], 0.35)
  let n = normalize(f.vNormal);
  let sun = bloxdSunDirection();
  var mainL = 0.0;
  if (dot(sun, sun) > 1e-8) {
    mainL = saturate(dot(n, sun));
  }
  let fillDir = normalize(vec3f(-0.5, -1.0, -1.0));
  let fillL = saturate(dot(n, fillDir)) * 0.45;
  l.directional = mainL + fillL;
  l.diffuse = view.diffuse.xyz;
  l.emissive = select(vec3f(0.0), vec3f(0.55, 0.50, 0.45), flags.emissive);
  l.ambient = view.ambient.xyz;
  l.blockLight = blockLight;
  l.skyLight = skyLight;
  l.ambientLightColour = ambientLightColour;
  l.skyLightColour = skyLightColour;
  l.heldLight = heldLight;
  l.fogColour = view.fogColour.xyz;
  // linear fog: fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart) (clamped)
  let dist = distance(f.vPosition, bloxdEyePosition());
  l.fogAlpha = clamp(1.0 - (view.fogParams.y - dist) / (view.fogParams.y - view.fogParams.x), 0.0, 1.0);
  l.position = f.vPosition;
  l.normal = f.vNormal;
  l.localPosition = f.vLocalPosition;
  l.flags = flags;
  l.textureId = f.vTextureId;
  l.textureRotation = f.vTextureRotation;
  l.uv = f.vUv;
  l.mipLevel = f.vMipLevel;
  return l;
}
${isLiquid ? `
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
  // texture_depth_2d 版の level は整数 (i32/u32) — 0.0 だと型不一致で弾かれる
  let d = textureSampleLevel(sceneDepth, sceneDepthSampler, bloxdSpScreenUV, 0u);
  if (d >= 0.9999) {
    return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
  }
  // レイスケール復元 — 実エンジンと同じ式 (docs: history/v3 §51):
  //   behind = eye + (frag - eye) * max(zOpaque / zFrag, 1)
  // z は軸距離 (near/far から再構築)。同一レイ上では軸距離の比率がそのまま
  // レイパラメータになるため、方向の除算が不要で数値も安定。
  let near = view.nearFarViewport.x;
  let far = view.nearFarViewport.y;
  let ndcOpaque = d * 2.0 - 1.0;
  let axisOpaque = 2.0 * near * far / (far + near - ndcOpaque * (far - near));
  let ndcFrag = bloxdSpFragDepth * 2.0 - 1.0;
  let axisFrag = 2.0 * near * far / (far + near - ndcFrag * (far - near));
  let scale = max(axisOpaque / axisFrag, 1.0);
  let eye = bloxdEyePosition();
  let behind = eye + (bloxdSpFragPosition - eye) * scale;
  return BloxdOpaqueBehind(true, behind, distance(behind, eye));
}` : ''}

@vertex
fn vsMain(in: VertexIn) -> FragmentOut {
  var out: FragmentOut;
  let flags = decodeFlags(in.flagsBits);
  let vin = BloxdVertexIn(in.position, in.normal, in.localPosition, flags);
  // splice 相当: vertex フック (allow variant のみ。strict は検証がはじく)
  var renderPos = in.position;
  ${useVertexHook ? `let vout = ${hookVertex}(vin);
  renderPos = vout.position;` : ''}
  out.vPosition = renderPos;
  out.vNormal = in.normal;
  out.vColour = in.colourRaw / 255.0;
  out.vUv = in.uv;
  out.vTextureId = in.textureId;
  out.vTextureRotation = in.textureRotation;
  out.vMipLevel = in.mipLevel;
  out.vFlagsBits = in.flagsBits;
  out.vLightLevels = in.lightLevels;
  out.vLocalPosition = in.localPosition;
  out.pos = view.viewProj * vec4f(renderPos, 1.0);
  return out;
}

@fragment
fn fsMain(f: FragmentOut) -> @location(0) vec4f {
  // 現在フラグメント情報を bloxdSp* に反映 (エンジンの一時変数と同じ役割)
  bloxdSpTextureRotation = f.vTextureRotation;
  bloxdSpFragPosition = f.vPosition;
  bloxdSpScreenUV = f.pos.xy / view.nearFarViewport.zw;
  bloxdSpFragDepth = f.pos.z;

  var surface = buildSurfaceIn(f);
  // splice 相当: surface フック → baseColor / alpha の書き戻し
  ${has.surface ? `let sout = ${hookSurface}(surface);` : `let sout = bloxdDefaultSurface(surface);`}
  ${isLiquid || !strict
? `var color = vec4f(sout.colour, sout.alpha);`
: `var color = vec4f(sout.colour, 1.0);`}
  ${!isLiquid && !strict ? 'if (color.a < 0.5) { discard; }' : ''}

  // litColour キャプチャ: fog 直前 (エンジンの splice 位置と同じ)
  let lightIn = buildLightIn(f);
  let lit = bloxdLitColour(sout, lightIn);

  // splice 相当: light フック → 「return color」の置き換え
  ${has.light ? `var lightIn2 = lightIn;
  lightIn2.litColour = lit;
  let lout = ${hookLight}(sout, lightIn2);
  color = vec4f(lout.colour, color.a);`
: `color = vec4f(bloxdApplyFog(lit + sout.emission, lightIn), color.a);`}

  return vec4f(saturate(color.rgb), color.a);
}
`

  const source = [
    '// ============================================================',
    '// generated by Bloxd Shader Studio — variant: ' + (strict ? 'strict' : 'allow') + '.' + program,
    '// macros: ' + (macros.join(' ') || '(none)'),
    '// ============================================================',
    common,
    '// ------------------ engine header (verbatim, preprocessed) ------------------',
    header.code,
    '// ------------------ pack code (preprocessed) ------------------',
    user.code,
    '// ------------------ studio runtime ------------------',
    runtime
  ].join('\n')

  return { source, macros, hasHooks: has }
}

