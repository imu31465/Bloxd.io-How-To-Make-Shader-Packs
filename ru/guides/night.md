# Проектирование ночных видов

> Целевой API: 5 · Целевой билд: `bbb6l5` (2026-11-20, прод и preprod) · Статус: Verified (портировано под текущий API — рекомендуется перепроверить на устройстве)

Если затемнять только тени, итоговый цвет рендерера (`engineColour`) остаётся ярким даже при отсутствии солнца. Из-за этого контраст между освещёнными поверхностями и тенями выглядит неестественно. Поэтому следует уменьшать яркость всего итогового цвета, а не только теней.

В примере нулевой вектор `bloxdSunDirection()` означает ночь, а ненулевой — день. В тёмное время яркость итогового цвета ландшафта уменьшается. Если значения `blockLight` или `heldLight` велики, затемнение ослабляется, чтобы сохранить свет от ближайших источников, например факелов. Значение `0.52` можно менять: чтобы сделать ночи темнее, уменьшите его.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
    }
    // гасим готовый цвет; emission материала добавляем штатно через туман
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Ограничения метода:** если `bloxdSunDirection()` возвращает единичный вектор при наличии солнца и ноль в его отсутствие, этот способ позволяет различить день и ночь, но не даёт плавно оценить рассвет и сумерки. Поскольку уменьшается яркость итогового цвета, одновременно ослабляются дневной и окружающий свет движка. Метод не воспроизводит полный ход изменения освещения в течение суток. Для применения того же подхода к жидкостям проверьте поведение fallback у соответствующих хуков.
