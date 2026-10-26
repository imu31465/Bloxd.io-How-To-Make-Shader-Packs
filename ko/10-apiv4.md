[← 이전 부](09-apiv3.md)·[매뉴얼로 돌아가기](README.md)

# 제10부: API Version 4 마이그레이션 가이드 (2026-10-26, 요약)

> 이 문서는 이 언어용 간략 요약이다. 모든 세부사항·예제 레시피·복원된 엔진 내부 (§55–§66)를 담은 완전판은 [영어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) 와 [일본어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md) 판에 있다.

대상 빌드: `cnty9.main.669f8081.js` — **2026-10-26부터 프로덕션과 프리프로드에 동시 적용** (양쪽 모두 바이트 동일). 팩 모델은 형태를 유지한다: 같은 `pack.json` 필드, 같은 로더 제한, 같은 64 B uniform, 같은 6개 훅.

## 바뀌는 것

- `pack.json`은 `"apiVersion": 4` 를 요구 (엄격 `===`, 숫자) — v3 팩은 로드 시 거부.
- **새 텍스처 API (핵심):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` 는 블록 텍스처 아틀라스를 엔진 자신과 정확히 같은 방식으로 샘플링한다 (id 0 = 흰색; 애니메이션 텍스처는 자동으로 현재 프레임 반환), `bloxdTextureSize(mipLevel) -> vec2u`, 그리고 명명 상수 `bloxdTextureId*` (파일명의 CamelCase, 예: `grass_top` → `bloxdTextureIdGrassTop`; 공식 목록은 `BLOCK_TEXTURES.md`).
- `BloxdSurfaceIn` *과* `BloxdLightIn` 에 **4개的新 입력 필드**: `textureId`, `textureRotation` (시계방향 4분회전, `bloxdTexel` 이 적용), `uv` (블록 단위; `fract(uv)` 가 그려짐), `mipLevel`.
- **의미가 바뀌는 개명:** `fogVisibility` → `fogAlpha`, 의미 **반전** (`0 = 포그 없음, 1 = fogColour 만`; 포팅: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (본체 동일); `BloxdOpaqueBehind.found` → `hit`.
- **strict 게임이 번들 내장 검증기로 강제됨:** 가드 없는 버텍스 훅이나 도달 가능한 `discard` 는 `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` 를 내고 strict 게임에서 **모든** 훅을 비활성화한다. `#ifndef BLOXD_STRICT` 랩을 쓰면 surface/light 는 계속 동작.
- 나머지는 동결: 6 훅, `blockFlags` 비트 (1/2/4/8/16/32), uniform 레이아웃, 로더 제한, 배리언트 행렬, 12개 allow 타이틀 (`cnty9` 에서 2026-10-27 불변 재확인).

## 간단 마이그레이션

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (숫자) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` 또는 `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| 가드 없는 버텍스 훅 | `#ifndef BLOXD_STRICT ... #endif` |

공식 레퍼런스가 등장했다 (`bloxd-api.wgsl` 와 `BLOCK_TEXTURES.md`, 공식 Discord). 전체 세부사항 — `bloxdTexel` 의 회전 미묘함, 복원된 샘플링 WGSL, 약 900개 사용 가능 상수의 이름 레지스트리, 레지스트리 해시를 포함한 새 `HEADER_VERSION` 구조 — 는 영어·일본어 완전판에 있다.

[← 이전 부](09-apiv3.md)·[매뉴얼로 돌아가기](README.md)
