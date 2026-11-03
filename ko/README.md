# Bloxd.io 셰이더 팩 개발 문서

Bloxd.io의 WebGPU 렌더러를 위한 셰이더 팩에 대한 비공식 가이드 — 제작·구현·검증·배포부터 API 사양과 엔진 내부 연구까지.

## 현재 사양

- 현재 API: **5** (`pack.json`에 `apiVersion: 5` 선언 필수)
- 대상: WebGPU 렌더러
- 최종 확인: 2026-11-03
- 대상 빌드: `ab90qa.main.6188124c.js` (프로덕션과 프리프로덕션이 동일 번들 — md5 `fc3322212d15be2445c0e8dfc9733fcc`로 검증)
- 셰이더 훅: 9개 (Terrain / Liquid / Model × Vertex / Surface / Light)

셰이더 팩이 처음이라면 [Getting Started](getting-started/)(영어)부터, API를 찾는다면 [API Reference](api/)(영어)부터 시작하세요.

> 이 문서는 게임 개발사의 공식 자료가 아닙니다. 엔진 내부 사양은 업데이트로 바뀔 수 있습니다 — 각 페이지에 표기된 대상 빌드와 검증 상태를 확인하세요.
>
> 이 가이드는 AI 지원으로 작성되었으며 정확성은 보장되지 않습니다. 실제 게임 동작으로 검증하세요.
>
> 셰이더 팩 기능 자체는 게임 내 UI에서 접근하는 공식 기능이며, 팩은 순수 WGSL입니다(JS 실행·네트워크 없음). 일반적인 코드로는 위험한 일이 일어나지 않습니다.

## 목적별 입구

| 목적 | 분류 | 독자 |
|---|---|---|
| 첫 셰이더 팩 만들기 | [Getting Started](getting-started/) | 처음 만드는 사람 |
| API 함수·필드 조회 | [API Reference](api/) | 구현 중인 작가 |
| 효과 구현 (빛, 물, 모델…) | [Guides & Recipes](guides/) | 특정 룩을 만드는 사람 |
| 오류 해결 | [Troubleshooting](troubleshooting/) | 깨진 팩을 가진 사람 |
| 엔진 내부 조사 | [Engine Internals & Research](internals/) | 엔진 분석가 |
| 이전 버전 조회 (v1–v5) | [Version History](history/) | 구형 팩 마이그레이션 |

## 문서 구성

- **[Getting Started](getting-started/)** — 개요, 퀵 스타트, 팩 구조, pack.json, 9개 훅, 배리언트, 검증, 배포.
- **[API Reference](api/)** — v5 체계적 사양: 훅, 플래그, 입/출력 구조체, 전체 함수, 라이팅, 텍스처 API, 상수, 전처리기, 제한, 호환성, 896개 이름의 텍스처 카탈로그.
- **[Guides](guides/)** · **[Recipes](recipes/)** · **[Troubleshooting](troubleshooting/)** · **[Engine Internals & Research](internals/)** · **[Version History](history/)**

> 참고: Getting Started / API Reference / Troubleshooting와 Guides·Recipes·Internals의 v5 신규 페이지는 현재 **영어**로 제공됩니다(이 판의 번역 페이지와 동일한 구조). 이미 번역된 콘텐츠는 모두 보존됩니다.

## 검증 상태 라벨

| 라벨 | 의미 |
|---|---|
| Verified | 대상 빌드에서 검증됨 |
| Analyzed | 내부 구현 분석으로 확인됨 |
| Partially Verified | 일부만 확인됨 |
| Experimental | 실험적·미확정 |
| Historical | 과거 버전 자료 |
