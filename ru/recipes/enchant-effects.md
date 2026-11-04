# Эффекты зачарования

> Целевой API: 5 · Целевой билд: `xkg8x` (проверено в проде 2026-11-04) · Статус: Analyzed (восстановлено из живого заголовка)

v5 открыла пайплайн зачарования и на входах, и на выходах. Рецепты управления блеском зачарованных предметов и брони с сохранением математики движка.

## Входы и выходы

**Входы** (`BloxdSurfaceIn` / `BloxdLightIn` — только зачарованные предметы и броня, во всех остальных случаях 0):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**Выход** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

Движок подмешивает его внутри [`bloxdLitColour()`](../api/lighting.md) — сразу после шейдинга, до мирового света. `bloxdDefaultSurface` пропускает вход без изменений, поэтому **дефолтный вид совпадает с внутридвижковым поведением v4**.

## Понимание дефолтов

Вход `enchantColour.a` — это **анимированная** альфа — движок анимирует пробег блеска, поэтому чтение `.a` на каждом фрагменте бесплатно даёт движущийся узор. `enchantTier` и `enchantSpeed` согласованы по построению («faster at higher tiers»).

Незачарованные грани несут `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0`.

## Рецепт 1: реализм без блеска (две строки)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## Рецепт 2: блеск сильнее по уровню

`enchantTier` даёт классический «блеск, масштабируемый уровнем», без разбора цветов:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## Рецепт 3: перекраска блеска

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // низкие уровни синие, высокие фиолетовые
        out.enchantColour = e;
    }
    return out;
}
```

## Рецепт 4: пробег, управляемый enchantSpeed

Превратите `enchantSpeed` в фазу для собственного пробега:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## Рецепт 5: усиление вспышки урона (overlayColour)

`overlayColour` (только игроки/мобы; вспышка урона и т.п.) подмешивается до освещения в `bloxdLitColour`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

Безвредно на не-сущностях (там `overlayColour` — 0).

## Комбинация со своим освещением

Использование `bloxdLitColour()` сохраняет подмешивание зачарования/оверлея автоматическим:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Примечания

- Входы зачарования приходят **только на зачарованные предметы и броню** — на террейне, воде и незачарованных гранях все 0
- Изменение выхода `enchantColour` никогда не трогает `colour` напрямую — подмешивание происходит в `bloxdLitColour` / `bloxdDefaultLight`
- Вне модельного пайплайна входы зачарования всегда 0

## См. также

- [Освещение](../api/lighting.md) · [Структуры](../api/structures.md) · [Рецепты шейдеров моделей](model-shaders.md)
