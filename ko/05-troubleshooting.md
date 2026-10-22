[← 이전 부](04-realism.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](06-implementation.md)

# 제5부: 트러블슈팅·주의

> 현행 게임은 2026-10-19부터 `apiVersion: 3` 을 요구하며 로드 시 v1/v2 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 의 변경 사항을 확인할 것.

## 17. 자주 나오는 에러와 고치기

| 증상 | 고치기 |
|---|---|
| strict 게임에서 읽히지 않는다 | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `.alpha` 가 미정의라고 나온다 | `#ifdef BLOXD_ALPHA` 로 감싼다 |
| `blockLight` 가 미정의라고 나온다 | `#ifdef BLOXD_LIGHTING` 로 감싼다. 공용 헬퍼 함수는**함수째** 감싼다 (v2에서는 필드가 항상 존재하므로 보통 일어나지 않는다. 판정용 가드는 남긴다) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` 를 기점으로 고친다 |
| `pack.json needs "apiVersion": 3.` | `apiVersion` 이 없거나 `3` 가 아니다. 수치 `3` 를 넣는다 (문자열 `"3"` 는 불가). v1/v2 팩은 `shaderPack:loadWrongApiVersion` 으로 거부된다 |
| `There's no pack.json at the top of the pack.` | ZIP 최상위에 `pack.json` 이 없다. 폴더째 굳히지 않았는지 확인한다 |
| `bloxdTerrainVertex must be declared as: fn ...` | 시그니처 불일치. 표시된 선언대로 다시 쓴다 |
| `bloxdTerrainVertex can't run in strict games...` | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` 로 감싼다 (v2에서는 필드가 항상 존재하므로 보통 일어나지 않는다) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` 로 감싼다 |
| `pow(l.skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 | `l.skyLight` 는 리프트 곡선 통과 후의 값 (생값 0.87 이 0.97 로 도착한다). R9.12 의 리프트 역변환 + 임계값 커트로 전환한다 (10장) |
| `... can only be a function's parameter or return type, ...` | 초기화 없는 `var x: BloxdSurface;` 는 거부된다. `bloxdDefault*` 에서 만든다 |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform 은 팩에서 직접 참조 불가. `bloxdTime()` 등의 헤더 함수 경유로 쓴다 |
| `Packs can't declare bloxd_ names...` | 자신의 식별자에서 `bloxd_` 접두사를 뺀다. 정의할 수 있는 것은 6개 훅명뿐 |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` 등을 기점으로 고친다. light 훅 첫 파라미터 복사 (`var out = s;`) 에서 시작해도 된다 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` 는 불가. `_ = f();` 로 쓴다 |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 지형 훅 안의 `bloxdOpaqueBehind()` 호출을 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 |
| `...only surface and light hooks can use.` | vertex 훅 안의 `bloxdOpaqueBehind()` 를 지운다 (surface / light만 가능) |
| `Lite: …reads scene depth on a page that didn't turn it on` | 깊이 읽기 ([제8부](08-apiv2.md) §35) 를 하는 팩이 유효한 상태로 페이지를 재읽어 다시 연다. 깊이 텍스처의 준비는 페이지 생성시에 확정된다 |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | 에러가 아니라 strict 게임에서의 자동 비활성화 (`shaderPack:offInStrict`). vertex 훅과 `discard` 는 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 제2단계 (브라우저 Tint) 의 에러. `^` `&` `\|` `<<` `>>` 의 피연산자는 괄호로 묶는다 (§38) |
| `loadDuplicateManifest` (zip 읽기에서) | `pack.json` 이 2개 있다 (대소문자 차이 포함). 1개로 한다 |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | URL 의 `?renderer=` 와 localStorage 의 `bloxdRenderer` 를 빼고 재읽는다 ([제7부](07-internals.md) §29) |
| 원경이 하얗게 흐리다 | 이중 포그가 원인인 경우가 많다. 완성색은 포그 완료 상태이므로 독자 안개는 삼가고 채도만 떨어뜨리는 방식을 검토한다 |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | 발광 블록이 밀도 높은 영역·영역 건너에서 빛의 시드 큐가 넘쳐 그 청크의 라이트 계산이 도중에 끊겼다는 경고. 팩 유래가 아니지만, **발광 집중부의 라이트 빠짐은 이 사양**이 원인이며, 월드 측에서 광원을 분산시키면 피할 수 있다 |
| 게임 참가시에 팩이 제외된다 | 게임 개시시의 실기 체크에서 실패하고 있다. 가드 누락을 다시 본다 |
| 실기 체크가 끝나지 않아 `This device couldn't check …` 등으로 팩이 빠진다 | 체크에는 60초의 강제 타임아웃이 있다 (초과분은 `skipped` 취급). 저사양 단말·무거운 월드에서 나오기 쉬우므로, 부하가 큰 vertex 처리나 복잡한 루프 구조를 줄여서 재시도한다 |

### 로더 단계의 에러 ID 일람

설정 화면의 에러에는 `shaderPack:load*` 의 ID가 붙는다. 문구 검색의 보조로:

| ID | 의미 |
|---|---|
| `loadZipTooBig` | zip 이 32MB 초과 |
| `loadTooManyZipEntries` | zip 엔트리가 1024개 초과 |
| `loadTooManyWgsl` | `.wgsl` 이 256개 초과 |
| `loadSourceTooBig` | `.wgsl` 합계가 256KB 초과 (파일 단위의 스트리밍 검사) |
| `loadManifestTooBig` | `pack.json` 이 64KB 초과 |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` 이 JSON 이 아니다 / 오브젝트형이 아니다 |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` 없음 / `3` 가 아니다 (v1/v2 는 거부) |
| `loadNoName` / `loadAuthorNotString` | `name` 없음 / `author` 가 문자열 이외 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 대응 외 압축 방식 / zip64 / 분할 / 암호화 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | 경로 중복 / UTF-8 이외 / 전개 실패 / zip 손상 |

`loadNoManifest` / `loadDuplicateManifest` (pack.json 의 위치·중복) 는 위 표의 해당 행을 참조.

## 18. 권리·주의

- 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩 제작은 예정된 행위로 간주된다. 단 공개된 공식 문서는 현재 존재하지 않는다
- 팩은 순수 WGSL이며, JS 실행·네트워크 액세스는 설계상 불가능하다
- 본서는 비공식 안내서이며, 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다

[← 이전 부](04-realism.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](06-implementation.md)
