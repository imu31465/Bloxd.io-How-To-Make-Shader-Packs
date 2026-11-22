# Проектирование ночных видов

> Целевой API: 5 · Целевой билд: `bbb6l5` (2026-11-20, прод и preprod) · Статус: Verified (портировано под текущий API — рекомендуется перепроверить на устройстве)

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

**Ограничения метода:** `bloxdSunDirection()` возвращает направление солнца, поэтому направление луны можно получить, взяв его с обратным знаком (`-bloxdSunDirection()`). В стандартных мирах солнце неподвижно, поэтому и луна не движется; движение есть только в мирах с циклом дня и ночи. Если значение принимает лишь вид единичного направления или нуля, оно позволяет различать день и ночь, но не плавно передавать сумерки. Этот пример затемняет готовый цвет террейна, поэтому одновременно ослабляет дневной и рассеянный свет движка, а не воспроизводит освещение полного суточного цикла. Для жидкостей проверьте механизм fallback соответствующих хуков.
