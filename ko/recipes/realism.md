# 리얼계 레시피



> 「바닐라의 겉모습을 소재에서 다시 짜는」 물리계 레시피집. 전제:
>
> 1. **light 훅은 프래그먼트의 최종단에서 불린다**. 반환한 colour 가 그대로 최종색. **직접 포그를 다시 걸 필요가 있다** (R9.10)  
> 2. **엔진 기존의 조명은 곱셈뿐**. 스페큘러 / 프레넬 / 난색-냉색 분리 / 반구 환경광은 제로에서 만든다  
> 3. `l.engineColour` 는 완성색 (포그 완료). 버리고 `s.colour` (알베도) 에서 다시 짜는 것이 본격파  
> 4. 텍스처는 금지 → 디테일은 전부**절차적** (해시/노이즈) 으로 넣는다 (R9.8)

## R9.1 난색 토치 × 냉색 하늘빛

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 중간 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // 포그 다시 걸기
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission 재가산
}
    return out;
}
```

## R9.2 태양 스페큘러 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
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
}
    return out;
}
```

## R9.3 Schlick 프레넬

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 가장자리의 옅은 밝기
}
    return out;
}
```

## R9.4 반구 환경광 (위=하늘 / 아래=바닥의 튐)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // 아래: 튐
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 위: 하늘빛
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 중간 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // 포그 다시 걸기
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission 재가산
}
    return out;
}
```

## R9.5 ACES 필믹 (Narkowicz 근사)

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

## R9.6 대기 원근법 (거리로 채도가 떨어지는 「공기감」)

> 주의: 안개 색에 휘도를 들어올리는 처리 (`normalize` 등) 를 적용하면, 안개가 어두운 씬에서 「밝은 흰 안개」 가 떠 오르고,  
> engineColour (포그 완료) 에 더해 안개색을 가산하면 이중 포그로 하얗게 된다. **공기감은 채도 저하만으로 표현**하는 것이 안전.

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

## R9.7 파법선 + 태양 글린트 (수면의 「태양의 길」)

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
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 절차적 마이크로범프 (텍스처 금지의 회피책)

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
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // 블록 안 로컬 좌표
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 동굴의 비선형 암화 + 등불 보호

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // 등불 있는 곳은 들어올린다
        out.colour *= mix(keep, 1.0, sky * sky);     // 암화는 비선형 (2제곱)
}
    return out;
}
```

## R9.10 포그를 다시 거는 정석 (engineColour 를 버렸을 때 필수)

> `(1.0 - l.fogAlpha)` 를 `min(l.fogAlpha, 0.75)` 처럼 하한과 함께 쓰면 「이 이상 짙어지지 않는다」 조정이 된다  
> (0.0 = 엔진 준수 / 0.3~0.5 = 원경 클리어).  
> 참고로 엔진 포그는 지평선 전용 linear 포그 (그리기 거리 부근만) 이며, 중거리 안개는 팩측에서 만들어야 한다.
> 실포그 설정 (구현 대조 완료): linear 고정 / `fogStart` = 그리기 청크 거리 / `fogEnd` = +1 청크 / 포그 끄기에서는 100~101 청크로 사실상 무효 / 기본 포그색은 RGB (183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // 포그 재현 (0.15=엷은 하한)
        col += s.emission * (1.0 - l.fogAlpha);            // emission 도 포그 적용으로
        out.colour = col;
}
    return out;
}
```

## R9.11 시네마-grade (그림자는 한색 / 하이라이트는 난색 / 밤은 디새추레이트)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // 태양 방향이 제로일 때만 밤 취급. 노을의 연속 변화는 표현하지 않는다
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 투영풍 섀도우 — 리프트 역변환 + 임계값 커트 (결정판)

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
    if (bloxdLit()) {
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
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission 도 잊지 말고 (포그된 상태로 가산)
}
    return out;
}
```

> 조정 가이드: **그림자의 면적은 `shTh`만으로 정해진다** — `0.93`=반경1.5 이상 / `0.87`=반경2 / `0.80`=반경3 / `0.67`=반경5.  
> 그림자 가장자리의 딱딱함은 `shSoft` (0.02=딱딱 / 0.08=소프트). 그림자 심의 어둡기는 `0.09` (최저 환경광) 와 `0.16` (하늘 산란광)  
> 의 2점 시프트로 정해진다. 해 질 녘에 그림자를 넓히고 싶으면  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` 를 더한다 (긴 해 질 녘 그림자의 근사.  
> `sunDir` 은 `bloxdSunDirection() / length(bloxdSunDirection())`). 그림자의 푸름은 `vec3f(0.72, 0.82, 1.05)` 의 B 를 올린다.
