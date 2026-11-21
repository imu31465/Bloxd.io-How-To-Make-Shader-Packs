# 팩 형식

> 대상 API: 5 · 유형: API 참조

매니페스트, ZIP 아카이브 제한, 팩 uniform을 정리합니다. 설정 절차는 [시작하기](../getting-started/manifest.md)를 확인하세요.

## pack.json

`pack.json`을 ZIP 아카이브 루트에 두세요. JSON 객체여야 합니다.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| 필드 | 형식 | 필수 | 설명 |
|---|---|---|---|
| `apiVersion` | number | 예 | 숫자 `5`를 지정합니다. 문자열은 허용되지 않습니다 |
| `name` | string | 예 | 앞뒤 공백을 제거한 뒤 비어 있지 않은 이름 |
| `author` | string | 아니요 | 작성자 이름 |
| `keepCircleShadows` | boolean | 아니요 | `true`로 설정하면 그림자 API를 사용할 때도 기존 원형 그림자를 유지합니다 |

## 로더 제한

| 항목 | 제한 |
|---|---:|
| 팩당 `.wgsl` 파일 수 | 256 |
| 전체 `.wgsl` 소스 | 256 KB |
| `pack.json` | 64 KB |
| ZIP 아카이브 | 32 MB |
| ZIP 항목 수 | 1,024 |

분할 ZIP, Zip64, 암호화된 항목, 지원하지 않는 압축 방식은 지원하지 않습니다. 모든 파일을 UTF-8로 저장하고 아카이브에 중복 경로를 포함하지 마세요.

## 팩 uniform

팩 uniform은 80바이트이며 `@group(3) @binding(0)`에 바인딩됩니다.

| 오프셋 | 필드 | 형식 |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

uniform의 최소 바인딩 크기는 80바이트입니다. 그룹 3의 다른 바인딩은 Liquid 베리언트용 씬 깊이 텍스처와 `bloxdSpTextureLayers` 스토리지 버퍼입니다.

## 관련 문서

- [매니페스트 만들기](../getting-started/manifest.md)
- [API 참조](./)
- [API v5 마이그레이션 가이드](../history/v5.md)
