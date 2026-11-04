# Делаем воду естественной

> Целевой API: 5 · Целевой билд: `xkg8x` (2026-11-04, прод) · Статус: Verified (портировано на текущий API — рекомендуется перепроверка на устройстве)
Этот API не умеет сэмплить цвет сцены, поэтому это **псевдо-стилизация со смешением цвета по френелю и солнечными бликами, а не настоящее отражение/преломление** (математика глубины использует жидкостный `bloxdOpaqueBehind()` — рецепт поглощения по толщине находится ниже на этой странице). Сэмпл ниже сохраняет базовый цвет, слегка подмешивает небоподобный цвет на скользящих углах обзора и добавляет маленький блик, только когда солнце есть.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

Ориентиры настройки:

- Вода белая/выстиранная: снижайте `0.38` в `fresnel * 0.38` и блик `0.55`.
- Вода слишком тёмная: подмешайте чуть больше `fakeSkyReflection`. В переборе выглядит пластиком.
- Линии или регулярные полосы на воде: снижайте частоты волн и силу блика. Этот код не двигает вершины меша.
- Хотите настоящие отражения пейзажа: во входах этого API нет цвета экрана, поэтому смешение цветов никогда не станет настоящим отражением (глубина — только для жидкостей — см. [Функции: bloxdOpaqueBehind](../api/functions.md)).

Этот рецепт **заменяет** существующий `bloxdLiquidLight`. Не вставляйте его рядом с одноимённой волновой функцией из R9.7 и другими одноимёнными хуками.


## Подводная реальность с шейдер-паками



Подводные виды состоят из 3 слоёв:

| Слой | Содержимое | Управляется из паков? |
|---|---|---|
| ① Рендер террейна/жидкости | Обрабатывается хуками. Light-хуки под водой вызываются штатно | Да (работает «под вуалью») |
| ② Вуаль из определения жидкости | Эмиссивный полноэкранный квад из цвета/альфы определения жидкостного блока в позиции камеры, рисуемый самым передним. Игровая настройка `cameraTint` побеждает, если задана | Нет (ни цвет, ни плотность не меняются) |
| ③ cameraTint | Настройка игры | Нет |

Практические пункты: паки продолжают работать под водой / вуаль не снять / по подводности не разветвиться (fogStart / fogEnd / fogColour под водой не меняются, так что fogAlpha её тоже не детектирует).
