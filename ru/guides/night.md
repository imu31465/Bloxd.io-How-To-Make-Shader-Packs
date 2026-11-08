# Проектирование ночных видов

> Целевой API: 5 · Целевой билд: `v98qt8` (2026-11-08, прод и preprod) · Статус: Verified (портировано под текущий API — рекомендуется перепроверить на устройстве)

Затемнение только теней оставляет готовый цвет движка (`engineColour`) ярким без солнца, и разрыв грань/тень выглядит неестественно. Гасите весь готовый цвет.

Пример трактует нулевой `bloxdSunDirection()` как ночь, а направленное солнце — как день, гася готовые цвета террейна в тёмные часы. Где сильны `blockLight` и `heldLight`, затухание слабеет, чтобы сберечь ближний свет вроде факелов. `0.52` — настроечное значение, для более тёмных ночей снижайте.

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

**Ограничения этого фикса:** если `bloxdSunDirection()` ведёт себя как «единичное направление при солнце, ноль без него», день/ночь различимы, но сумерки плавно не оценить. А раз гасится готовый цвет, engine-дневной свет и ambient слабеют вместе — не полное воспроизведение времени суток. Чтобы применить то же к жидкостям, проверьте fallback-отношения жидкостных хуков.
