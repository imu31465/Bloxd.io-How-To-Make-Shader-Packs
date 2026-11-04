# 엔진 데이터 대장

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04; 프로덕션; 셰이더 팩의 모든 표면에서 preprod 동일) · 상태: Verified

이 문서의 실측 대장 — 확정된 모든 값을, 현행 대상 빌드 `xkg8x` 에서 잰 값으로 실었다.

## 대장

| 항목 | 값 |
|---|---|
| `apiVersion` | `5` (엄격 `===`, 숫자) |
| 엔진 헤더 | 디코드 8,954 B / 208행 (출하 상태 9,125 B, 보간 6개). 첫 줄 `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — 전문은 [엔진 헤더](engine-header.md) |
| 훅 | 9개 (terrain/liquid/model × vertex/surface/light). 이름 불변. 기본 템플릿이 9개 전부를 묶는다 |
| 베리언트 | 6개 (strict × 프로그램). 이름은 `strict\|allow.terrain\|liquid\|model` — 라이팅 축은 소멸 |
| 매크로 | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (모든 액체 + 비strict 지형/모델) · `BLOXD_SCENE_DEPTH` (모든 액체) · ~~`BLOXD_LIGHTING`~~ **제거** |
| 팩 uniform | `@group(3) @binding(0)`, 64 B: seconds@0, **lit@4 (u32, 신규)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| 팩 바인딩 | group 3: 0 uniform · 1 씬 깊이 (액체) · 2 `bloxdSpTextureLayers` 스토리지 |
| 플래그 | `BloxdFlags` 구조체, 14 bool. v4 의 비트값은 은퇴 |
| 로더 제한 | 256 `.wgsl` / 256 KB 소스 / 64 KB `pack.json` / 32 MB zip / 1,024 엔트리; UTF-8; 매니페스트 하나; 경로 유일 — 모두 불변 |
| 텍스처 레지스트리 | 1,210 엔트리 → **사용 가능 896 이름**. cnty9 대비 드리프트 +1/−10 ([텍스처 레지스트리](texture-registry.md)) → `xkg8x` (2026-11-04): 1,220 / **906 사용 가능 이름** — 10건 제거가 모두 뒤집힘, 376건 id 변화 |
| 라이트 곡선 | 0–15 레벨 → 0–1, 이즈아웃 (`6 → 0.45`, `12 → 0.92`) — 헤더 안, 불변 |
| 리프트 곡선 | `1 - (1 - x / (3 - 2x))^3` — 불변 (현재 청크 c9) |
| 방향광 원뿔 | `0.12 / 0.65 / 0.62 / 0.95` — 불변 (청크 c9) |
| 포그 색 | `vec3f(183/255, 191/255, 195/255)` — 불변 |
| 예약명 | `/^bloxd/i` (대소문자 무관) + 46개 `bloxdSp*` 엔진 심볼 ([예약 식별자](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(텍스처 레지스트리)>` |
| strict 타이틀 | [정책](policy.md) 의 allow 12 타이틀 이외 전부 (xkg8x 에서 재확인, 불변) |
| 헤더/레지스트리 빌더 | 청크 c55 (모듈 29833 + 1371 + 1391 + 1384 + 219 이 조정); `xkg8x` 에서는 빌더가 모듈 30093 (데이터 모듈 1391) |
| 기본 팩 템플릿 | 청크 c116 (v4 의 c124 에서 이동), 1,683 B |

## 번들 구성 (재조사자용)

셰이더 파이프라인 클러스터: 로더/퍼시스턴스 c51–c53, 검증기/헤더/레지스트리 빌더 c55, WebGPU/코드젠 c56, 포그 c9. **기본 팩 템플릿은 c116** (v4 에서는 c124).

청크 형식 비고: 모든 청크는 ES 모듈 (`export const modules = {...}`) 이며 — c53 이 c52 와 c53 양쪽의 모듈을 싣는다 — 번들의 플레인 텍스트 검색은 여전히 의미가 있다 (모듈 id `1371` 은 *main* 의 희소 모듈 배열에 있고, 어느 청크에도 없다).

메인 번들은 3.39 MB (v4 빌드 대비 +115 KB). 청크 맵은 195개 ID (188 방출, 7개의 알려진 빈틈).

## 과거 대장

- v4 (cnty9, 2026-10-27) → [버전 히스토리: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [버전 히스토리: v3](../history/v3.md)

## 관련 문서

- [리서치 로그](research-log.md) · [엔진 헤더](engine-header.md) · [정책](policy.md)
