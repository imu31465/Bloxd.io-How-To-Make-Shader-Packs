> [← 이전 부](2-api.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](4-realism.md)

# 제3부: 레시피집

- [R1. 색 레시피 (surface)](#r1-색-레시피-surface)
- [R2. 조명 레시피 (light)](#r2-조명-레시피-light)
- [R3. 발광 레시피 (emission)](#r3-발광-레시피-emission)
- [R4. 좌표 레시피 (월드/블록/시선)](#r4-좌표-레시피-월드블록시선)
- [R5. 시간 레시피 (애니메이션)](#r5-시간-레시피-애니메이션)
- [R6. 액체 레시피](#r6-액체-레시피)
- [R7. 정점 레시피 (allow 한정)](#r7-정점-레시피-allow-한정)
- [R8. 수식 잔기술집](#r8-수식-잔기술집)
- [R9. 리얼계 레시피](#r9-리얼계-레시피)

---

모든 조각은 8 베리언트를 통과한다는 전제의 가드와 함께 쓰여 있다. 그대로 복사해 상수를 만지작거리기만 하면 쓸 수 있다. 단 아래 레시피는 개별 예시이며 위에서 전부 연결하는 용도가 아니다. 같은 훅명 (`bloxdTerrainLight` 등) 이나 같은 헬퍼 함수명을 복수 붙이면 동일 모듈 안에서 정의가 중복되어 컴파일에 실패한다. 복수의 효과를 쓸 경우는 훅을 종류마다 1개로 모아 그 함수 안으로 통합한다.

## R1. 색 레시피 (surface)

### 단색 틴트 (가장 기본)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 채도 부스트 / 디새추레이트

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 으로 선명하게 / -1.0 으로 완전 모노크롬
```

### 색온도 (따뜻함 ⇄ 차가움)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 따뜻함 (빨강 강함), -1.0 = 차가움 (파랑 강함)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### 빈티지 / 세피아

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 고도 그라데이션 (낮은 땅을 따뜻하게)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 고도 0..50 에서 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 면의 방향으로 칠하기 (위쪽=밝게, 벽=어둡게)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 바닥 1 / 벽 0 / 천장 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 벽은 다소 어둡게 천장도 어둡게
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 포스터리제이션 (색수를 줄이기)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. 조명 레시피 (light)

### 콘트라스트 S자 커브

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 거리 헤이즈 (독자 포그)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 블록에서 192 블록으로 0..0.35 의 포그를 직접 더한다
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 밤 (skyLight 구동의 파랑 시프트 + 등불 보호)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### 동굴을 깜깜하게 (skyLight 없는 곳을 더 어둡게)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` 는 리프트 후의 값 (10장) 이므로, 옅은 가림 (나무 밑 등. 생값 0.87 → 리프트 후 0.97) 은 이 방법으로는 거의 어두워지지 않는다. 동굴 (생값 0) 에는 통한다. 「숲그늘」 을 또렷하게 하고 싶으면 R9.12 의 리프트 역변환 + 임계값 방식을 쓴다.

### 밤의 파란 환경광 (달의 방향을 쓰지 않는 유사 표현)

> 이 API에서는 태양 없는 하늘의 `bloxdSunDirection()` 은 제로이다. 방향성 달빛이 아니라, 어두운 하늘에 희미한 파란 환경광을 더할 뿐이다. 단 달의 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드 한정. [제7부](7-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### 노을의 따뜻함 (태양 고도로 색을 기울이기)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 지평선에서 1 / 바로 위에서 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 엔진 출력의 완전 교체 (가장 단순한 재조명)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) 의 직접 구축은 금지. default 에서 만들어 colour 를 고친다
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (엔진의 조명 결과) 를 버리고 「소재의 색 × 직접 계산한 밝기」 로 교체한다
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour 를 버렸으므로 포그를 다시 거는 것 (필수)
    out.colour = col + s.emission * l.fogVisibility;   // emission 도 직접 더한다 (필수)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. 발광 레시피 (emission)

> `emission` 은 조명 계산 후에 가산되지만, 기존 처리에서는 **`fogVisibility` 가 곱해져 감쇠한다. 즉 완전히 안개에 잠긴 원경에서는 emission 도 사라진다. 원경에서도 빛나게 하고 싶은 성분은 emission 에 더하지 말고, light 훅 안에서 `out.colour += ...` 로 직접 가산한다** (engineColour 는 포그된 상태이므로, 원경에서는 안개색 위에 빛이 얹힌다)

### 등불의 맥동 (횃불이 숨쉰다)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 발광 광석 느낌 (밝은 소재를 빛나게)

```wgsl
// surface 측: 소재가 밝을 (흴) 수록 emission 을 얹는다
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 반딧불 무리 흉내 (시간으로 공간을 떠도는 광점)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 몇 개의 「빛의 구슬」 이 천천히 이동한다. distance 의 역수로 빛나게 한다
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 좌표 레시피 (월드/블록/시선)

### 월드 좌표

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### 블록 좌표 (공식 레시피 — 헤더 주석 유래)

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### 체크무늬 (블록 단위)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 또는 1
out.colour *= mix(0.96, 1.04, checker);
```

### 블록 단위의 의사 난수 (해시)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 용도: 풀색의 베리에이션, 돌의 색얼룩 등
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 시선 벡터와 림라이트

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 시선 각도 (프레넬 흉내 — 액체용)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 바로 위에서 1 / 얕은 각도 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 시간 레시피 (애니메이션)

> `bloxdTime()` 은 3600초 (1시간) 에 감긴다. 셰이더 경과 시간이며 게임 안의 태양·낮밤과 동기된다는 보장은 없다. 겉보기 주기 애니메이션에는 쓸 수 있지만 실제 밤 판정에는 `bloxdSunDirection()` 이나 조명 입력을 우선한다.

### 낮밤 사이클 (1시간에 1일)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 의 1시간 주기. 게임 안의 낮밤과 동기되리라는 보장은 없다
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### 흔들림 (복수 sin 의 겹침)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### 밴드가 흐르는 오로라 / 형광 띠

```wgsl
// XZ 위치와 시간으로 3색을 섞는다
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. 액체 레시피

### 수면의 잔물결 (색의 명멸)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 는 항상 BLOXD_ALPHA — 가드는 습관상
    #endif
    return out;
}
```

### 고도를 사용한 투명도의 유사 변화 (진짜 여울 판정이 아니다)

> v1에서는 씬 깊이나 수중 바닥의 위치를 참조할 수 없어, 이 API만으로는 실제 수심을 계산할 수 없었다. v2에서는 액체 한정으로 `bloxdOpaqueBehind()` 로 안쪽 불투명면까지의 두께를 잴 수 있다 ([제8부](8-apiv2.md) R-E). 아래는 그것을 쓰지 않는 종래의 유사 연출이며, `s.position.y` 는 로컬 좌표이므로 그대로 쓰면 청크 원점의 변화로 효과가 어긋난다. 월드 고도로 알파를 바꿀 뿐인 유사 연출이며, 해안선이나 수중 바닥을 따른 여울 표현이 아니다. `packWaterReferenceY` 는 월드 고도에 맞춰 조정한다.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 낮은 고도에서는 얇게, 높은 고도에서는 원래 알파에 가깝게. 게임 안에서 방향은 확인할 것.
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 수중에서 본 수중 안개

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 액체에만 통하는 팩 (지형 무손상 구성)

```wgsl
// terrain_* 훅을 일절 쓰지 않는다. 그러면:
//  - terrain 베리언트 = 훅 없음 = 지형은 엔진 기존 그대로
//  - liquid 베리언트  = liquid_* 훅만 유효
```

## R7. 정점 레시피 (allow 한정)

> 전부 `#ifndef BLOXD_STRICT` 로 감쌀 것.
> 실행 조건 (allow 타이틀 일람·Custom Games 는 strict) 의 상세는 본편 §30 참조 → [§30 게임별 적용 모드](7-internals.md#30-게임별-적용-모드-shaderpackpolicy)

### 풀잎이 바람에 흔들린다 (위쪽만 움직인다)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 수직면만
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 액면의 파도 (윗면만)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 맥동하는 지형

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 법선 방향으로 미세하게 팽창수축
    return out;
}
#endif
```

### 파도치는 지형 (거대 sin 파)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. 수식 잔기술집

```wgsl
// 0..1 을 매끄럽게 단계화 (n 단)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2단계의 임계값 (툰 그림자)
let shadow = smoothstep(0.35, 0.37, level);   // 임계값±0.02 로 계단을 만든다

// 3단계 툰
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 루마 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 매끄러운 펄스
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 삼각파 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 초 → 「느린 위상」 으로 변환 (3600초 감김을 고려하지 않는 연출용)
let phase = t * 0.15;
```

## R9. 리얼계 레시피

> 「바닐라의 겉모습을 소재에서 다시 짜는」 물리계 레시피집. 전제:
>
> 1. **light 훅은 프래그먼트의 최종단에서 불린다**. 반환한 colour 가 그대로 최종색. **직접 포그를 다시 걸 필요가 있다** (R9.10)  
> 2. **엔진 기존의 조명은 곱셈뿐**. 스페큘러 / 프레넬 / 난색-냉색 분리 / 반구 환경광은 제로에서 만든다  
> 3. `l.engineColour` 는 완성색 (포그 완료). 버리고 `s.colour` (알베도) 에서 다시 짜는 것이 본격파  
> 4. 텍스처는 금지 → 디테일은 전부**절차적** (해시/노이즈) 으로 넣는다 (R9.8)

### R9.1 난색 토치 × 냉색 하늘빛

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 중간 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // 포그 다시 걸기
    out.colour = col + s.emission * l.fogVisibility;                 // emission 재가산
    #endif
    return out;
}
```

### R9.2 태양 스페큘러 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // 하프 벡터
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick 프레넬

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 가장자리의 옅은 밝기
    #endif
    return out;
}
```

### R9.4 반구 환경광 (위=하늘 / 아래=바닥의 튐)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 아래: 튐
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 위: 하늘빛
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 중간 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // 포그 다시 걸기
    out.colour = col + s.emission * l.fogVisibility;                        // emission 재가산
    #endif
    return out;
}
```

### R9.5 ACES 필믹 (Narkowicz 근사)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 노출
    return out;
}
```

### R9.6 대기 원근법 (거리로 채도가 떨어지는 「공기감」)

> 포그 (색으로 교체) 와는 별개로 「거리로 디새추레이트」 를 얹으면  
> 원경이 훨씬 리얼해진다.  
> 주의: 공기감은 채도만 떨어뜨리는 것이 안전. 휘도는 건드리지 않는다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 거리 감쇠 (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 채도만 떨어뜨린다 (휘도는 불변)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 파법선 + 태양 글린트 (수면의 「태양의 길」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 높이 h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 절차적 마이크로범프 (텍스처 금지의 회피책)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // 블록 안 로컬 좌표
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 동굴의 비선형 암화 + 등불 보호

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // 등불 있는 곳은 들어올린다
    out.colour *= mix(keep, 1.0, sky * sky);     // 암화는 비선형 (2제곱)
    #endif
    return out;
}
```

### R9.10 포그를 다시 거는 정석 (engineColour 를 버렸을 때 필수)

> `l.fogVisibility` 를 `max(l.fogVisibility, 0.25)` 처럼 하한과 함께 쓰면 「이 이상 짙어지지 않는다」 조정이 된다  
> (0.0 = 엔진 준수 / 0.3~0.5 = 원경 클리어).  
> 참고로 엔진 포그는 지평선 전용 linear 포그 (그리기 거리 부근만) 이며, 중거리 안개는 팩측에서 만들어야 한다.
> 실포그 설정 (구현 대조 완료): linear 고정 / `fogStart` = 그리기 청크 거리 / `fogEnd` = +1 청크 / 포그 끄기에서는 100~101 청크로 사실상 무효 / 기본 포그색은 RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // 포그 재현 (0.15=엷은 하한)
    col += s.emission * l.fogVisibility;            // emission 도 포그 적용으로
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 시네마-grade (그림자는 한색 / 하이라이트는 난색 / 밤은 디새추레이트)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // 태양 방향이 제로일 때만 밤 취급. 노을의 연속 변화는 표현하지 않는다
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 투영풍 섀도우 — 리프트 역변환 + 임계값 커트 (결정판)

> **전제 재확인 (10장)**: `l.skyLight` 는 생 voxel 값 (n/15) 이 아니라 엔진이 「리프트 곡선」  
> `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 통과시킨 후의 값.
>
> | 장소 | voxel 생값 | 리프트 후 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 열린 하늘 | 1.00 | 1.00 | 1.00 |  
> | 나무 밑 (반경2) | 0.87 | **0.97** | **0.86** ← 거의 무손상 |  
> | 반경3 | 0.80 | **0.92** | 0.66 |  
> | 반경5 | 0.67 | 0.78 | 0.29 |
>
> **이것이 「감마를 올려도 그림자가 짙어지지 않는다」 의 원인** (수치로 증명). 그러나 곡선은 단조이므로 대수적으로 엄밀히 역변환할 수 있다:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. 생값을 복원하면, 후는**임계값 커트** (`smoothstep`) 로 이값화할 뿐.  
> LightEngine 의 BFS 옆확산은 「인접 1 블록 = -1」 이므로, 임계값 `th = 1 - r/15` 는 그대로  
> 「r 블록 이상의 가림을 그림자로 간주」 다이얼이 된다. 블록을 부수면 그림자도 즉시 움직인다 (LightEngine 이 실시간 재계산).  
> 제한: 그림자는 「위쪽 하늘」 기준이므로 태양의 이동으로는 돌지 않는다 (15장 「그림자의 진실」).

```wgsl
// ★엔진의 리프트를 엄밀히 역변환해 생 voxel skyLight (n/15) 를 복원
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL 에 cbrt 는 없으므로 pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★그림자 반경 다이얼: th = 1 - r/15 (0.87→반경2 이상이 그림자)
const shSoft = 0.04;   // 가장자리 부드러움 (0.02=딱딱 / 0.08=소프트)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // ① 생값 복원 (이것을 빼먹으면 영원히 그림자가 안 된다)
    let skyRaw = sh_unlift(l.skyLight);
    // ② 임계값 커트 — 낮=1 / 그림자=0 을 확실히 분리할 수 있다
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 태양 Lambert (태양 없을 때는 l.directional 로 폴백)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // ★투영의 정체: 태양의 직사광은 「하늘이 보이는 장소」 에만 닿는다
    let lit = sunL * sky;
    // 그림자측: 검정이 아니라 하늘색에 물든다 + 최저 환경광
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // 토치광은 그림자를 관통한다 (blockLight 도 리프트 후이므로 함께 복원)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // 포그를 다시 건다 (engineColour 를 버린 몫)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission 도 잊지 말고 (포그된 상태로 가산)
    #endif
    return out;
}
```

> 조정 가이드: **그림자의 면적은 `shTh`만으로 정해진다** — `0.93`=반경1.5 이상 / `0.87`=반경2 / `0.80`=반경3 / `0.67`=반경5.  
> 그림자 가장자리의 딱딱함은 `shSoft` (0.02=딱딱 / 0.08=소프트). 그림자 심의 어둡기는 `0.09` (최저 환경광) 와 `0.16` (하늘 산란광)  
> 의 2점 시프트로 정해진다. 해 질 녘에 그림자를 넓히고 싶으면  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` 를 더한다 (긴 해 질 녘 그림자의 근사.  
> `sunDir` 은 `bloxdSunDirection() / length(bloxdSunDirection())`). 그림자의 푸름은 `vec3f(0.72, 0.82, 1.05)` 의 B 를 올린다.
>
> ⚠️ 「`pow(skyLight, γ)` 로 콘트라스트를 깊게」 는**리프트 후의 값에 gamma 를 걸고 있었기** 때문에  
