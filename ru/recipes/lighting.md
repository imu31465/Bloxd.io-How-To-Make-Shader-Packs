# Рецепты освещения (light)

> Целевой API: 5 · Целевой билд: `bny9u` (2026-11-05, прод) · Статус: Verified (портировано на текущий API — рекомендуется перепроверка на устройстве)
## S-кривая контраста

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## Дальняя дымка (свой туман)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // добавляем 0..0.35 своего тумана от 64 до 192 блоков
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## Ночь (синий сдвиг по skyLight + защита ламп)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

## Пещеры впотьмах (ещё сильнее затемняем места без неба)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` приходит пост-лифт (раздел 10), поэтому лёгкое затенение (напр. под деревьями: сырое 0.87 → поднятое 0.97) этим методом почти не темнеет. Для пещер он работает (сырое 0). Чтобы заострить «тень деревьев», используйте инверсию лифта + порог из R9.12.

## Синее ночное окружение (псевдо-вид без направления луны)

> В этом API `bloxdSunDirection()` равен нулю, когда на небе нет солнца. Ниже — не направленный лунный свет, а лишь слабый синий ambient, добавляемый при тёмном небе. Само направление луны доступно через `-bloxdSunDirection()` (только миры с циклом день/ночь — [Солнце и луна](../internals/sun-and-moon.md)).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

## Закатное тепло (тинт по высоте солнца)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 у горизонта / 0 в зените
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## Полная замена вывода движка (простейшее переосвещение)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ПРИМЕЧАНИЕ: прямая конструкция BloxdLight(...) запрещена; переписывайте colour от default
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // отбрасываем engineColour (результат освещения движка) и берём «базовый цвет × своя яркость»
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour отброшен: туман нужно наложить заново
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission тоже добавьте сами (обязательно)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```
