# Освещение

> Целевой API: 5 · Целевой билд: `v98qt8` · Статус: Analyzed (восстановлен дословно из живого заголовка)

В v5 опубликован API освещения. То, что движок делал внутри (построение `litColour`), теперь можно вызывать из паков. Эта страница описывает входные данные освещения, функции и порядок обработки как единую систему.

## Полный пайплайн

Полная цветовая цепочка, как её показывает дефолтная реализация light-стадии (`bloxdDefaultLight`):

```
surface.colour
    │  смешивание с overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  умножение на bloxdShading(light) — отклик материала и угла
    ▼
shaded
    │  смешивание с enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  умножение на bloxdWorldLight(light) — мировой свет (ярчайший из блочного/небесного/ручного)
    ▼
lit = bloxdLitColour(surface, light)   ← цвет «до эмиссии и тумана»
    │  + surface.emission               ← эмиссия добавляется после освещения
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (итоговый цвет)
```

Порядок `bloxdLitColour()` (резюме из заголовка: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. применить `overlayColour`
2. затенить через `bloxdShading()`
3. применить `enchantColour`
4. применить мировой свет через `bloxdWorldLight()`

Порядок эмиссии и тумана: **эмиссия добавляется после освещения и до тумана**, и туман тоже топит эмиссию (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## Функции

### bloxdLit() — гейт

```wgsl
fn bloxdLit() -> bool
```

Включено ли блочное и небесное освещение. **Гарантии при выключении**:

| Поле | Значение при выключении |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (белый) |

`#ifdef BLOXD_LIGHTING` из v4 исчез. Замените на `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

### bloxdShading() — отклик материала и угла

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- умножает `directional` (суммарный Ламберт) на `diffuse` (RGB-отклик материала), прибавляет `emissive` (свечение материала) и `ambient` (RGB-ambient), ограничивает до 0–1
- **новые входы v5 `diffuse` / `emissive`** позволяют заменить только ламбертов член, сохранив отклик материала движка

### bloxdWorldLight() — свет мира

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- формирует каждый из трёх каналов (блочный / небесный / ручной) с `ambientLightColour` в роли пола, затем берёт **ярчайший**
- `skyLight` интерполируется от `ambientLightColour` к `skyLightColour` по величине небесного света

### bloxdLitColour() — рецепт движка

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — туман

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = нет тумана, 1 = только fogColour** (инвертирован по сравнению с `fogVisibility` из v4)
- `fogColour` — RGB тумана игры; **`vec3f(0.0)`, когда в игре нет тумана**

### bloxdDefaultLight() — дефолт целиком

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Входные поля (BloxdLightIn)

| Поле | Тип | Смысл | Примечание |
|---|---|---|---|
| `litColour` | `vec3f` | освещённый и зачарованный RGB (до эмиссии и тумана) | результирующее значение, а не источник |
| `directional` | `f32` | суммарный Ламберт от направленных светов | 0, когда направленных светов нет |
| `diffuse` | `vec3f` | RGB-отклик материала на направленный свет | позволяет `bloxdShading()` восстановить отклик материала |
| `emissive` | `vec3f` | RGB-свечение материала (прибавляется к направленному) | |
| `ambient` | `vec3f` | RGB-ambient (прибавляется к направленному) | |
| `blockLight` | `vec3f` | RGB блочного света | 0 при `!bloxdLit()` |
| `skyLight` | `f32` | небесный свет | 1 при `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | минимальный RGB-свет (пол) | 1 при `!bloxdLit()` |
| `skyLightColour` | `vec3f` | RGB-цвет skyLight | 1 при `!bloxdLit()` |
| `heldLight` | `vec3f` | RGB ручного света | 0 при `!bloxdLit()` или когда в руках ничего нет |
| `fogColour` | `vec3f` | RGB тумана игры | 0 без тумана |
| `fogAlpha` | `f32` | 0 = нет тумана, 1 = только fogColour | инвертирован по сравнению с `fogVisibility` v4 |

## Физика уровней света (фон, можно пропустить)

- **`blockLight` / `skyLight` / `heldLight` приходят уже отображёнными в 0–1**: уровни 0–15 через ease-out-кривую (напр. `6 → 0.45`, `12 → 0.92`). Все исключают `ambientLightColour`
- **Кривая лифта**: `skyLight` — на самом деле «видит ли эта позиция небо»: воксельные данные перекрытия, т.е. карта теней. Пороговому разделению солнца/тени может понадобиться обратное преобразование (см. [руководство по реализму](../guides/realism.md))
- **Внутрянка тумана**: в линейном режиме `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1), вычисляется повершинно в пространстве вида. Текущий билд — только линейный (подробности в [Внутрянка движка: внутрянка тумана](../internals/fog-internals.md))

## Рецепты

### Своё затенение + мировой свет движка

То, что авторы v4 приближали масштабированием `litColour`, теперь записывается точно:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // уже суммарный Ламберт
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### Оставить мировой свет движка, усилить только эмиссию

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### Ночной синий сдвиг (управляется skyLight)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## См. также

- [Функции](functions.md) · [Руководства: освещение](../guides/lighting.md) · [Внутрянка движка: внутрянка освещения](../internals/lighting-internals.md)
