# 로드 오류

> 대상 API: 5 · 상태: Verified

**로더 단계** (첫 관문) 에서 거부되는 오류. 설정 상태줄에 `shaderPack:load*` ID 로 표시된다.

## "There's no pack.json at the top of the pack."

- **원인**: zip 루트에 `pack.json` 이 없다 (예: 폴더를 한 단계 더 감싸서 압축함)
- **확인**: zip 을 열어본다 — `pack.json` 이 최상위에 (또는 공통 루트 폴더 하나 바로 아래에) 있는가
- **해결**: `pack.json` 과 `.wgsl` 파일을 직접 zip 한다. 단일 공통 루트 폴더는 자동으로 벗겨진다 ([팩 구조](../getting-started/pack-structure.md))
- **예방**: 압축 절차를 고정한다. macOS 「Compress」 는 그대로 통한다 (OS 찌꺼기는 자동 제외)

## zip 로드 시 `loadDuplicateManifest`

- **원인**: `pack.json` 이 두 개 (대소문자 차이 포함)
- **해결**: 정확히 하나만 둔다

## 크기·개수 제한

| 메시지 | 제한 |
|---|---|
| `The zip is over 32 MB.` | zip 32 MB |
| `The zip has more than 1024 entries.` | 1,024 엔트리 |
| `The pack has more than 256 .wgsl files.` | `.wgsl` 256개 |
| `The pack's .wgsl files are over 256 KB in total.` | 합계 256 KB |
| `pack.json is over 64 KB.` | 매니페스트 64 KB |

- **해결**: 불필요한 `.wgsl` 제거 / 파일 병합 / 주석 다듬기
- **예방**: 이 제한은 실질적 컴파일 시간 상한이기도 하다 — 증가는 리팩터링 신호로 다뤄라

## 형식 문제

분할 zip, zip64, 암호화 엔트리, 미지원 압축은 각각 전용 메시지로 거부된다. 모든 파일은 유효한 UTF-8 이어야 한다.

## 로더 오류 ID 레퍼런스

| ID | 의미 |
|---|---|
| `loadZipTooBig` | zip 32MB 초과 |
| `loadTooManyZipEntries` | 엔트리 1024 초과 |
| `loadTooManyWgsl` | `.wgsl` 256 초과 |
| `loadSourceTooBig` | 합계 256KB 초과 (파일별 스트리밍 검사) |
| `loadManifestTooBig` | `pack.json` 64KB 초과 |
| `loadManifestNotJson` / `loadManifestNotObject` | JSON 아님 / 객체 아님 |
| `loadNoApiVersion` / `loadWrongApiVersion` | 누락 / `5` 아님 ([API 버전 오류](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | `name` 누락 / `author` 비문자열 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 미지원 압축 / zip64 / 분할 / 암호화 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | 경로 중복 / 비UTF-8 / 압축 해제 실패 / zip 손상 |
| `loadNoManifest` / `loadDuplicateManifest` | 매니페스트 위치 / 중복 |

## "Ready. Reload the page to use it." 인데 아무 변화가 없다

- **원인**: 팩은 활성화에 **페이지 새로고침** 이 필요하다
- **해결**: 선택 후 다시 불러온다. 상태가 `Ready to use` 가 되어야 한다
- **주의**: 남은 렌더러 오버라이드 (`?renderer=`, localStorage `bloxdRenderer`) 는 팩의 기동을 거부시킨다 — 지우고 다시 불러라

## 관련 문서

- [API 버전 오류](api-version.md) · [팩 구조](../getting-started/pack-structure.md) · [팩 형식](../api/pack-format.md)
