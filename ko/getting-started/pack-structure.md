# 팩 구조

> 대상 API: 5 · 대상 빌드: `bny9u` · 상태: Verified

## 배포 형식

- **형식**: 단일 `.zip`, 또는 폴더 (폴더 로드는 데스크톱 브라우저만)
- **내용물**: `pack.json` 하나 (팩 최상위에. 대소문자 무구) + 1–256개 `.wgsl` 파일
- 여러 `.wgsl` 파일은 하나의 모듈로 연결되므로, 분할과 서브디렉터리는 자유다. 파일명 제약도 없다. 연결은 **경로명의 사전 순**으로 일어난다 (모듈 스코프 선언은 순서 무관이므로, `var` 초기화 순서에 의존하는 코드에만 영향한다). `.wgsl` 이 아닌 파일 (README 등) 은 무시된다

## 크기·형식 제한

| 항목 | 제한 | 초과 시 메시지 |
|---|---|---|
| zip 크기 | 32 MB | `The zip is over 32 MB.` |
| zip 엔트리 수 | 1,024 | `The zip has more than 1024 entries.` |
| `pack.json` 크기 | 64 KB (UTF-8) | `pack.json is over 64 KB.` |
| `.wgsl` 파일 수 | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` 소스 총량 | 256 KB (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| zip 형태 | zip64 / 분할 / 암호화 금지. store 또는 deflate. 중복 경로 금지 | 각각 전용 메시지로 거부 |

모든 파일은 유효한 UTF-8 이어야 한다.

## zip 묶기 팁

모든 내용물을 한 공통 루트 폴더 아래에 저장한 zip 은 그 접두사가 자동으로 벗겨진다 (macOS 「Compress」 는 그대로 통한다. `__MACOSX`, `._` 접두 파일과 `.DS_Store` 는 자동 제외된다). 루트 레벨에 흩어진 파일은 최상위 탐지를 깨뜨리므로, 가장 안전한 방법은 `pack.json` 과 `.wgsl` 파일을 직접 zip 하는 것이다 (`pack.json` 이 zip 루트에 있는지 확인하라).
