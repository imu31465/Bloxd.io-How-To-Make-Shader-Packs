# 문제 해결

오류와 외관 문제를 **증상으로** 찾는다. 페이지는 이 구조를 따른다: 증상 → 원인 → 확인 방법 → 해결 → 예방.

## 증상 인덱스

| 증상 | 페이지 |
|---|---|
| 팩이 로드되지 않음 / zip·pack.json 오류 | [로드 오류](loading.md) |
| `apiVersion` 메시지 / 구버전 팩이 안 돌음 | [API 버전 오류](api-version.md) |
| 컴파일 안 됨 / `must be declared as` / WGSL 구문 | [컴파일 오류](compilation.md) |
| 검증 오류 (예약명, strict 계약, `reaches`) | [검증 오류](validation.md) |
| 일부 베리언트에서만 실패 / strict 게임에서 떨어짐 | [베리언트 고유 문제](variants.md) |
| 이상해 보임 (흰 안개, 그림자 없음, 이상한 밤) | [외관 문제](visual.md) |
| 텍스처 이름 오류 / `did you mean` | [텍스처 문제](textures.md) |
| 밝기·그림자·포그 문제 | [라이팅 문제](lighting.md) |
| 모델·엔티티·인챈트 문제 | [모델 문제](models.md) |
| 느림 / 실기기 검사에서 탈락 | [퍼포먼스](performance.md) |
| 법적·안전·자주 묻는 질문 | [FAQ](faq.md) |

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04, 프로덕션 확인) · 상태: Verified (메시지는 라이브 검증기·로더에서 그대로 기록)

## 오류가 나타나는 곳

1. **설정 → Shader Pack 상태줄** — 로더 단계 오류 (ID 는 `shaderPack:load*`)
2. **로더 화면의 오류 목록** — 검증·컴파일 (file:line + 베리언트)
3. **브라우저 개발자 도구 콘솔** — 런타임·2단계 (브라우저 WGSL 컴파일러) 오류

3단계 로드 검사의 상세는 [시작하기: 검증](../getting-started/validation.md) 에 있다.
