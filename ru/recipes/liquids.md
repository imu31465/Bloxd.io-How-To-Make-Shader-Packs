# Рецепты жидкостей

> Целевой API: 5 · Целевой билд: `v98qt8` (2026-11-08, прод и preprod) · Статус: Verified (портировано на текущий API — рекомендуется перепроверка на устройстве)
## Рябящаяся поверхность (мерцание цвета)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // у жидкостей всегда есть BLOXD_ALPHA — guard оставлен по привычке
    #endif
    return out;
}
```

## Псевдопрозрачность по глубине через высоту (не настоящий тест на мелководье)

> Настоящая глубина воды требует жидкостного `bloxdOpaqueBehind()`, который меряет толщину до непрозрачной грани позади (полный рецепт: [Делаем воду естественной](../guides/water.md)). Ниже — более простой псевдо-стиль без него: `s.position.y` — локальная координата, поэтому в сыром виде эффект смещается при смене origin чанка. Конвертируйте через `bloxdWorldPosition()` для мировой высоты. Ниже alpha меняется лишь по мировой высоте — это псевдоэффект, а не мелководье с учётом берегов/дна. Подгоните `packWaterReferenceY` под высоту своего мира.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // ниже — тоньше, выше — ближе к базовой alpha; направление проверьте в игре
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## Подводная муть изнутри

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## Пак только для жидкостей (террейн нетронут)

```wgsl
// вообще не пишите никаких terrain_*-хуков. Тогда:
//  - варианты terrain = без хуков = дефолты движка для террейна
//  - варианты liquid  = действуют только liquid_*-хуки
```
