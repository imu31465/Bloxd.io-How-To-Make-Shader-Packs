[매뉴얼로 돌아가기](README.md)·[다음 부 →](2-api.md)

# 제1부: 팩 만들기

## 1. 개요와 전제

- 셰이더 팩은 **WebGPU 렌더러 전용**이다. 팩을 도입한 동안 설정의 WebGPU 렌더러가 강제 온이 된다
- 팩은 **WGSL의 제한된 서브셋**으로 기술한다. 대상은 **지형 (terrain) 과 액체 (liquid)** 의 겉모습뿐이다
- 할 수 있는 것: 색·투명도·발광 변경, 조명 재구축, 투영풍의 그림자 (R9.12), (일부 게임 한정으로) 정점 이동
- 할 수 없는 것: 텍스처 추가·샘플링, 포스트프로세스 (블룸 등), 태양과 함께 도는 픽셀 정밀도의 그림자 (섀도맵) 와 진짜 반사 (SSR) 의 신설, 하늘이나 엔티티에 적용
- 할 수 있는데 (간과하기 쉬운) 것: **`skyLight` (복셀 하늘 가림) 를 사용한 투영풍의 그림자** — 나무 밑·지붕 밑을 명확히 어둡게 할 수 있다 (R9.12). 블록을 부수면 LightEngine 이 즉시 재계산하므로 그림자도 실시간으로 따라간다
- **대다수의 게임은 strict 모드** (정점 이동·`discard` 금지) 이다. 일반 배포용 팩은 strict 로 동작하게 만들 것

## 2. 최단 순서

1. 폴더를 만들고 `pack.json` 과 `.wgsl` 파일을 둔다
2. 게임 설정 → Shader Pack 에서 zip 또는 폴더를 읽힌다
3. 에러가 나면 고쳐서 다시 읽힌다 ([제5부](5-troubleshooting.md))
4. 대응 게임에서 동작 확인한다
5. 완성되면 zip 으로 굳혀서 배포한다

## 3. 팩의 구성

- **배포 형태**: `.zip` 1개, 또는 폴더 (폴더 읽기는 데스크톱판 브라우저만)
- **내용**: `pack.json` 1개 (팩의 최상위에 배치. 대소문자 구별 없음) + `.wgsl` 파일 1~256개
- 복수의 `.wgsl` 은 연결되어 1 모듈로 취급되므로 분할·디렉터리 나누기는 자유. 파일명에 제약은 없다. `.wgsl` 이외의 파일 (README 등) 은 무시된다
- ZIP 묶기 요령: 전 파일이 공통된 1 계층의 루트 폴더에 들어 있으면 그 prefix 가 자동 제거된다 (macOS 「폴더를 압축」 으로 만든 zip 그대로 OK). 단 루트 계층에 여분의 파일이 섞이면 최상위 판정을 잃으므로, 확실한 건 폴더 안에 들어가서 `pack.json` 과 `.wgsl` 을 직접 지정해 굳히는 것 (`pack.json` 이 ZIP 직하에 오는 것을 확인할 것)

| 항목 | 상한 |
|---|---|
| zip 크기 / 엔트리 수 | 32MB / 1024 |
| pack.json 크기 | 64KB, UTF-8 |
| .wgsl 합계 크기 | 256KB, UTF-8 |
| zip 형식 | zip64·분할·암호화 zip 불가 |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `apiVersion` | 필수 | `2` 와 완전 일치시킬 것. `1` 팩은 `shaderPack:loadWrongApiVersion` 으로 거부된다 |
| `name` | 필수 | 빈 문자열 불가. 설정 UI 에 표시된다 |
| `author` | 임의 | 생략 가능. 문자열 이외 (수치 등) 는 에러 |

그 외의 필드는 무시된다.

## 5. 최소 템플릿

`pack.json` (4장) 과 아래 `pack.wgsl` 만으로 동작하는 팩이 된다:

```wgsl
// 은은히 따뜻한 최소 팩
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

지킬 작법:

- 출력 구조체는 **직접 구축하지 않는다** (`BloxdSurface(...)` 는 에러). 반드시 `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` 에서 시작해 필드를 고친다. 예외로 light 훅 첫 파라미터 (`s: BloxdSurface`) 는 출력과 동형이므로 `var out = s;` 로 시작해도 된다
- 초기화 없는 `var x: BloxdSurface;` (타입 주석뿐) 도 에러
- 훅의 파라미터는 **읽기 전용**이다. 고치고 싶으면 `var sv = s;` 처럼 복사하고 나서
- 자신의 식별자에 `bloxd_` 접두사는 쓸 수 없다 (6개 훅명 제외)
- 상수는 `const` 로 쓴다 (`#define` 에 값은 쓸 수 없다)

## 6. 6개 훅

전부 임의. 시그니처는 타입까지 정확히 일치시킬 것 (파라미터명은 자유).

| 훅 | 역할 |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | 지형 정점 이동. **strict 에서는 사용 불가** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | 지형의 색·투명도·발광. `s.colour` 는 텍스처×정점색 |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | 지형의 최종색. **프래그먼트의 최종단**에서 불리며 반환값이 그대로 최종색이 된다 |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (동형) | 액체판. `alpha` 는 액체의 투과율로 작용한다 |

폴백 규칙:

- liquid 훅이 미정의면 **terrain 의 동명 훅이 쓰인다** (역은 없음). surface 만 써도 액체에 같은 효과가 걸린다
- light 훅이 미정의면 기존 동작 (`engineColour + emission × fogVisibility`) 이 쓰인다
- `engineColour` 을 버리고 소재색에서 다시 짜면, 직접 포그를 다시 건다: `mix(l.fogColour, col, l.fogVisibility)`. emission 을 더할 때는 `fogVisibility` 를 곱하고 나서

## 7. 8 베리언트와 가드

쓸 코드는 1개지만 `{strict, allow} × {조명on, 조명off} × {지형, 액체}` 의 **8가지 전부에서 컴파일이 통해야 한다**.
조건 분기에 쓸 수 있는 것은 `#define` (값 없는) / `#ifdef` / `#ifndef` / `#else` / `#endif` 뿐이다. `#` 은 반드시 그 줄의 선두에 둔다 (함수 안에서도 가능).

| 가드 | 의미 | 용도 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | strict 이외 (allow) 에서만 | vertex 훅 전체, `discard` 를 감싼다 |
| `#ifdef BLOXD_LIGHTING` | 조명on 때만 | `blockLight`·`skyLight`·`ambientLightColour` 등을 만지는 코드를 감싼다. **공용 헬퍼 함수 (모듈스코프 fn) 는 함수째 감싼다** (호출측만 가드로는 불충분) |
| `#ifdef BLOXD_ALPHA` | `alpha` 필드가 있을 경우 (액체는 항상·지형은 allow 만) | `alpha` 를 만지는 코드를 감싼다 |

## 8. 쓸 수 있는 언어 기능·금지 사항

쓸 수 있는 것:

- WGSL 의 내장 함수 (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` 등 전부)
- 자신의 `fn` / `struct` / `const` / `alias` / `var<private>`, 함수 안의 `let`·제어 구문 (if/for/while/switch 등)
- `#ifdef` / `#ifndef` / `#else` / `#endif` / `#define` (플래그명만) — 행두라면 함수 안에서도 가능
- 미분 (`dpdx` / `dpdy` / `fwidth`) 은 surface/light 훅 (프래그먼트단) 에서만 사용 가능. vertex 불가
- `const` 배열·`ptr`·행렬도 사용 가능

금지·주의:

- **텍스처 불가**: `texture_*` / `sampler` 타입은 쓸 수 없다. 질감은 해시 노이즈 등의 절차적 계산으로 만든다
- **`discard` 는 strict 에서 금지** (`#ifndef BLOXD_STRICT` 로 감싼다)
- `@속성` / `enable` / `requires` / `override` 는 금지. `enable f16;` 을 쓸 수 없으므로 **f16계 타입은 사용 불가**
- `@builtin` 속성도 금지이므로 `fragCoord` (화면 좌표) 나 `vertex_index` 를 읽을 수 없다
- **모듈스코프 `let` 은 쓰지 않는다** (`const` 나 `var` 를 쓴다)
- `atomic` 은 쓸 수 없다
- 좌표계는 noa 로컬. 월드 좌표로 하려면 `bloxdOriginOffset()` 을 더한다. 블록 좌표는 `bloxdFaceBlock(position, normal)`

## 9. 검증·동작 확인·배포

읽히면 게임측에서 다음 순서로 검사된다:

1. 로더 제한 체크 (3장의 상한)
2. 정적 컴파일 (8 베리언트 전부)
3. 브라우저 WebGPU 에 의한 실컴파일 검증 (정적 검증은 타입 검사가 완전하지 않으므로 여기서 떨어지는 코드가 있다. 8장의 함정을 피할 것)

순서:

1. 설정 → Shader Pack 에서 zip / 폴더를 읽힌다
2. 스테이터스를 확인한다. 「Ready to use」 가 되면 성공. 「Saved, but it won't run until you fix these errors...」 의 경우는 에러 일람 (file:줄 + 베리언트 표기) 을 고쳐서 재읽기
3. 읽힌 후는 페이지를 새로고침해 유효화한다
4. 먼저 제한이 널널한 게임에서 확인하고, 다음에 strict 게임 (대다수는 이쪽) 에서 확인한다. 정점 이동을 쓰는 경우는 allow 게임에서만 동작한다
5. 완성되면 `pack.json` 을 최상위로 굳혀서 zip 으로 배포한다 (3장의 상한 이내일 것)
