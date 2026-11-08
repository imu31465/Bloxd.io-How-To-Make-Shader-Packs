# pack.json (매니페스트)

> 대상 API: 5 · 대상 빌드: `v98qt8` (2026-11-08, 프로덕션·preprod 확인) · 상태: Verified

`pack.json` 은 팩의 매니페스트다 — zip 루트에 정확히 하나의 JSON 객체.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## 필드

| 필드 | 형 | 필수 | 설명 |
|---|---|---|---|
| `apiVersion` | number | 필수 | **`5` 와 정확히 같아야 한다** (엄격 `===`). 문자열 `"5"` 나 다른 형은 실패하며, JSON 철자 그대로 보고된다 |
| `name` | string | 필수 | 트림 후 비어 있지 않을 것. 설정 UI 에 표시된다 |
| `author` | string | 선택 | 생략 가능. 있으면 string 이어야 한다 |

나머지 필드는 로더가 무시한다.

## 버전 불일치 시 일어나는 일

로더는 `manifest.apiVersion !== 5` 를 엄격히 비교해 **로드하는 순간 실패**한다. 메시지, 라이브 i18n 사전에서 그대로:

- `pack.json needs "apiVersion": {{version}}.` — 키가 통째로 없다
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — 키는 있지만 5가 아니다

과거에 저장한 구버전 팩은 예외를 던지지 않는다. `{kind: "none", reason: "otherApiVersion"}` 로 귀결되어 **조용히 비활성**이 된다. 이유는 셰이더 팩 설정 탭이 설명한다:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

v1–v4 에서의 이주는 [버전 히스토리](../history/) 를 보라.
