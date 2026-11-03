# 텍스처 샘플링의 내부

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (라이브 생성기 c56 에서 복원)

`bloxdTexel` / `bloxdTextureSize` 가 실제로 어떻게 컴파일되는가 — 3변형 텍스처 코드젠. 사용자 쪽: [텍스처 API](../api/texture-api.md).

## 세 가지 변형

### 변형 1 — 텍스처팩 비활성 (스텁)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

진짜 아틀라스용으로 쓴 코드도 여기서는 컴파일되고 실행된다 — 흰 텍셀과 1×1 크기가 보일 뿐.

### 변형 2 — 아틀라스 경로 (게임 기본)

`bloxdTextureSize` 은 `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))` 를 반환한다. `bloxdTexel` 은 로드 전에 면의 4분회전을 적용한다 — 회전 함정이 생성된 `bloxdSpTurned` if-체인으로 쓰여 있다:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` 은 입력 필드 `textureRotation` 의 엔진 자체 저장이다.)

### 변형 3 — 커스텀 텍스처팩 텍스처

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` 이 레이어 아틀라스의 텍스처별 셀을 샘플한다. 팩 자신의 텍셀은 `bloxdSpOwnTexel` 경로를 지난다.

## 애니메이션 프레임 사다리

애니메이션 텍스처 (42 계열) 는 계열별 고정 간격 (200 / 250 / 300 ms — [텍스처 카탈로그](../api/texture-catalog.md#animation-families-42-names) 의 간격 열) 으로 진행된다. 애니메이션 계열 id 를 `bloxdTexel` 에 넘기면 현재 프레임이 샘플된다.

## 샘플러 설정

블록 텍스처는 `texture_2d_array` 이고, 지형 샘플러는 nearest + repeat 다.

## greedy 메싱과 UV

메셔는 머티리얼/AO/라이트가 같은 면을 하나의 직사각형으로 병합한다 (**greedy 메싱**). 그래서 병합면의 버텍스 UV 는 타일 폭을 넘을 수 있다 (가장자리에 0.0015 인셋). 타일링은 하드웨어 repeat 어드레싱이 처리하므로 병합면은 이어 보인다 — 다만 `uv` 에 건 절차적 디테일은 병합 경계에서 어긋날 수 있다. 월드 의존 효과는 대신 `bloxdWorldPosition(position)` 에 걸어라.

## 관련 문서

- [텍스처 API](../api/texture-api.md) · [텍스처 레지스트리](texture-registry.md) · [렌더링 파이프라인](rendering-pipeline.md)
