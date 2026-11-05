# 퀵 스타트

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션 확인) · 상태: Verified

5분 만에 첫 팩을 만든다.

## 1. 파일 만들기

`pack.json` 과 `pack.wgsl` 을 넣은 폴더를 만든다:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — 최소한의 난색 틴트 팩:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> 엔진 헤더 (상수·구조체·함수) 는 로드 시 모든 팩 앞에 자동으로 붙는다 — 직접 쓸 일은 없다. 헤더 전문은 [엔진 내부와 연구](../internals/engine-header.md) 에 재현되어 있다.

## 2. 게임에서 로드

1. 설정 → Shader Pack 을 열고 zip 이나 폴더를 로드한다 (폴더 로드는 데스크톱 브라우저만)
2. 상태를 확인한다: 선택 직후에는 "Ready. Reload the page to use it." 가 보이고, **페이지 새로고침 후** "Ready to use" 가 성공을 뜻한다
3. "Saved, but it won't run until you fix these errors..." 가 보이면, 나열된 오류 (file:line + 베리언트) 를 고치고 다시 불러라

## 3. 검증

1. 먼저 허용적인 게임에서 테스트한다
2. 이어서 strict 모드 게임에서 (대부분의 게임이 strict 다)
3. 정점 애니메이션은 allow 표시된 게임에서만 동작한다

## 4. 배포

zip 으로 묶는다 — [배포](distribution.md) 를 보라.

## 막혔다면

- 오류의 의미 → [문제 해결](../troubleshooting/)
- 훅 쓰는 법 → [셰이더 훅](hooks.md)
- 9훅 전체 템플릿은 다음 페이지 [셰이더 훅](hooks.md) 에 있다
