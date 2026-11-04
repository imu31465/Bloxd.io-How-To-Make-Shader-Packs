# 디버깅 도구

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04, 프로덕션) · 상태: Analyzed (프로덕션 번들의 JavaScript 수준 분석)

- URL 파라미터 `?renderer=lite` — Lite (WebGPU) 렌더러를 강제 (`webgl2` / `babylon` 도 가능. `babylon` 은 webgl2 의 옛 이름 에일리어스). 우선순위는 URL 파라미터 > localStorage 의 `bloxdRenderer` > 설정 화면 > 기본 (webgl2). 무효값은 경고와 함께 무시된다. URL 이나 localStorage 에 오버라이드가 남아 있으면, WebGPU (lite) 가 필요한 국면에서 실패해 「needs the new WebGPU renderer, so remove the renderer override...」 가 나올 수 있다 ([로드 에러](../troubleshooting/loading.md) 참조)
- URL 파라미터 `?vconsole` — 화면 안 콘솔 (VConsole) 기동. 모바일 실기 검증에 요긴하다
- URL 파라미터 `?drawcalls=1` — 그리기 통계의 디버그 패널이 추가된다. 디버그용 콘솔에서 게임 오브젝트를 고르거나, `drawCalls()`·`why()`·`configureDrawCallWatching()` 를 써서, 팩에 한정되지 않은 대규모 기믹의 중복 그리기 (오버드로) 나 1 도면당 약 6.5만 정점의 상한 도달을 확인해, 성능 부족의 원인을 가를 수 있다
- 콘솔에는 `noa-engine v0.33.0` 과 `Renderer: lite from <소스>` 가 나온다 — 그리기 경로 오진단 방지에 먼저 이것을 확인할 것
- WebGPU 렌더러는 팩 적용 중 「강제 ON」 으로 잠긴다. 「Disable Block Texture Atlas」 설정도 잠기며 (아틀라스 ON 유지), WebGPU 미대응 환경에서는 애초 팩이 적용되지 않는다. 배포 페이지에 「WebGPU 대응 브라우저가 필요」 라고 쓰는 근거는 여기이다
- 블록 텍스처의 실체는 2D 배열 텍스처 (`texture_2d_array`) 로, 지형의 샘플러는 nearest 이며 repeat 로 설정되어 있다. 더 나아가 메셔는 재질·AO·라이트가 일치하는 면을 1개의 구형으로 묶는 (**greedy meshing**) 때문에, 정점의 UV는 병합면 위에서는 타일 폭을 넘을 수 있다 (가장자리에 0.0015 의 인셋). 반복 측은 하드의 repeat 어드레싱이 담당하므로, 병합면은 심 없이 보인다. 단 `vUV` 를 기준으로 절차적 디테일을 얹으면, 병합면의 경계에서 불연속이 될 수 있으므로, 월드 위치 (`s.position` + `bloxdRenderOffset()`) 를 기준으로 설계하는 것이 안전하다
- 게임 참가 때마다 런타임 재검증 (`checkCompilation`) 이 돌아, 실재하는 전 지형 소재를 브라우저 WebGPU 로 실컴파일한다 (설정 화면의 정적 검증보다 엄격). 여기서 떨어지면 팩은 그 게임에서 제외된다
