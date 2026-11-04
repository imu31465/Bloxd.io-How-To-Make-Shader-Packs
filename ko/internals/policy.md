# 게임별 셰이더 팩 정책

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션) · 상태: Analyzed (프로덕션 번들의 JavaScript 수준 분석)

이 페이지는 `allow / strict` 가 타이틀 단위에서 무엇을 의미하는지 확정한다. 게임 정의 측의 `shaderPackPolicy` 이 명시적으로 `"allow"` 인 타이틀만 full 모드 (vertex 훅, `discard`, 지형 `alpha`) 로 움직이고, 지정이 없는 (또는 allow 이외의) 타이틀은 strict 가 된다 — `BLOXD_STRICT` 가 정의되고, 가드 내부의 코드는 자동으로 무효화된다. 이 판정은 팩 측에서 고를 수 없으므로, 어느 타이틀에서 무엇이 움직이는지 아는 것이 배포의 전제가 된다.

- 근거 빌드: `szby6g.main.94a7596c.js` (2026-10-17 시점의 정식 배포). 전체 111 게임 정의를 정적으로 분석한 결과 **allow 26 엔트리 (12 타이틀) / strict 85 엔트리**. 같은 12개의 allow 리터럴이 같은 12개 타이틀에서 v3 프로덕션 번들 (`3ymzdd`, 2026-10-20) 과 v4 번들 (`cnty9`, 2026-10-27) 에서도 변경 없이 재확인되었다 — 아래 목록은 v3·v4에도 그대로 적용된다. 그리고 v5 빌드에서도 다시 불변: `ab90qa` (2026-11-03) 와 `xkg8x` (2026-11-04, allow 리터럴 12개 재계산) 에서 재확인했다 — 아래 목록은 v5 에도 그대로 적용된다.
- `shaderPackPolicy` 보다 상위의 판정으로서 배포 채널 측의 게이트 (`canUseShaderPacks` 상당) 도 있어, 외부 포털 경유의 배포 (Coolmath Games 판 등) 에서는 `shaderPackPolicy` 의 판정에 이르기 전단에서 셰이더 팩 기구 자체가 무효화될 수 있다. 이하의 allow / strict 의 판별은 bloxd.io 본가 Web판의 해석에 근거한다.
- allow 는 게임 정의 안의 직접 리터럴 8곳과 기저 변수 (`tb` / `kz` / `cb` / `Fb`) 4곳, 합계 12곳에서 선언되고, 베리언트는 스프레드 상속 (`{...tb,...}`) 으로 받는다. 베리언트 단위의 개별 덮어쓰기 (부모 allow·자식 strict 의 역 패턴) 는 현재 제로.

allow 의 12 타이틀 (합계 26 엔트리):

- **Test Gym** — 기본 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (합계 11 엔트리)
- **Doodle Cube** — 기본 + Solos / Duos (합계 3)
- **Rocket Obby** — 기본 + Sheep / January (합계 3)
- **단독 타이틀 (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 측에서 특히 오해하기 쉬운 점:

- **Superflat Creative (classic_creativeFlat) 은 strict**. 「Creative」 를 이름에 포함하지만, classic 계열에서 allow 인 것은 통상의 Creative (`classic_creative`) 뿐. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 등도 전부 strict
- **Custom Games (customGames) 은 strict**. 자작 커스텀 게임에서는 vertex 훅 계열의 효과가 발동하지 않는다. 작업용 검증은 Test Gym 을 사용하는 것이 확실
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 계열의 주요 PvP·서버계 타이틀은 전부 strict

한편 strict 타이틀에서도 팩의 로드와 컴파일 자체는 이루어지고, surface / light 등 프래그먼트 측 레시피는 통상대로 움직인다. 제한을 받는 것은 vertex 훅 (`bloxdTerrainVertex` / `bloxdLiquidVertex`) 과 `discard`, 그리고 지형 `alpha` (액체는 항상 존재) 이다.

이 일람은 상기 빌드 시점의 정적 분석 결과이며, 엔진 갱신으로 allow/strict 의 배분은 변할 수 있다. 새판이 나오면 재확인할 것.
