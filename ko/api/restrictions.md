# 제한과 예약명

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Verified (v4 제한을 v5 에서 바이트 동일로 재확인)

팩이 쓸 수 있는 것과, 이름 예약 규칙의 전모.

## 허용되는 것

- WGSL 내장 (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- 자신의 `fn` / `struct` / `const` / `alias` / `var<private>`, 함수 안의 `let` 과 제어 흐름 (if/for/while/switch…)
- 도함수 (`dpdx` / `dpdy` / `fwidth`) 는 서피스/light 훅 (프래그먼트 스테이지) 에서만 — 버텍스 훅에서는 불가
- `const` 배열 (컬러 LUT 등), 포인터 (`ptr<function, T>`), 행렬 (`mat3x3f` 등)
- 플래그 정의 `#define NAME` (값 없음) + `#ifdef` 조건부

## 금지 / 주의

- **텍스처 직접 접근 불가**: `texture_*` / `sampler` 형은 선언할 수 없다. 아틀라스 읽기는 [`bloxdTexel`](texture-api.md) 경유뿐이다. *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **strict 에서 `discard` 금지** — `#ifndef BLOXD_STRICT` 로 감싼다
- `@attributes` / `enable` / `requires` / `override` 금지 — `enable f16;` 이 없으므로 **f16 형도 없다**
- `@builtin` 이 없어 `fragCoord` / `vertex_index` 는 손에 닿지 않는다
- **모듈 스코프 `let` 불가** — `const` 나 `var` 을 쓴다
- `atomic` 없음
- **출력 구조체를 직접 생성하지 마라**: `BloxdLight(...)` 은 정적 검증에 실패한다. `bloxdDefault*` 에서 시작한다
- bare `var x: BloxdSurface;` 도 검증 오류이다
- 훅 파라미터는 읽기 전용 — 바꾸려면 먼저 복사한다
- `#define` 은 값을 받지 않는다 (이름만)

## 예약명

### bloxd 접두사 (일반 규칙)

**`/^bloxd/i` (대소문자 무관) 에 맞는 모든 식별자가 예약된다.** 유일한 예외는 9개 훅 함수명이다.

검증기 문구, 그대로:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### bloxdSp* 네임스페이스 (46 심볼)

코드 생성기가 주입할 수 있어 재선언할 수 없는 46 심볼:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

플래그 구조체 전달 (`bloxdSpFlags`), 인챈트·모델 로컬 입력 (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), 셀 샘플링 텍스처팩 경로, 회전 체인, 확장 훅 로컬을 덮는다. **팩 수준의 예약 규칙은 이 목록보다 넓다** (`/^bloxd/i` 에 맞는 전부) — 외울 필요 없이, 자신의 이름을 절대 `bloxd` 로 시작하지 않으면 된다.

### 텍스처 이름

`bloxdTextureId` 로 시작하는 식별자는 텍스처 이름 상수로 해석된다 ([텍스처 API](texture-api.md#bloxdtextureid-이름-붙은-텍스처-상수)).

## 자동 재작성

- **Y 도함수 부호 반전**: 분석기는 `dpdy`, `dpdyCoarse`, `dpdyFine` 호출 전부를 `(-dpdy(...))` 로 재작성한다 (dpdy 계열이 검증기의 토큰 재작성 패스에서 반전 집합으로 명시 열거되어 있다). 화면공간 y 는 아래를 향하므로, 이 반전이 「위로 갈 때의 변화율」을 직관에 맞춘다. 「위로 가며 h 는 어떻게 변하나」라는 의도로 `dpdy(h)` 를 쓰면, 내보내는 코드가 반전을 싣는다. `dpdx` 와 `fwidth` 계열은 손대지 않는다

## 실제로 보게 되는 진단

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## 관련 문서

- [문제 해결: 컴파일](../troubleshooting/compilation.md) · [엔진 내부와 연구: 셰이더 검증](../internals/shader-validation.md)
