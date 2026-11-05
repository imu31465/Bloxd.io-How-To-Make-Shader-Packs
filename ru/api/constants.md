# Константы

> Целевой API: 5 · Целевой билд: `bny9u` · Статус: Analyzed (восстановлено дословно из живого заголовка)

Заголовок даёт три константы (константы имён текстур `bloxdTextureId*` рассматриваются в [API текстур](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Константа | Тип | Значение | Описание |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | пи |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (удобно для периодов) |
| `bloxdChunkSize` | `i32` | 32 | блоков вдоль каждой стороны чанка |

## Использование

### bloxdPi / bloxdTau

Объявлены за вас — определять собственное пи не нужно. `bloxdTau` удобна для периодической анимации:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

Число блоков вдоль каждой стороны чанка в виде именованной константы, по которой можно ветвиться. Полезно для эффектов с периодом чанка (шахматные узоры, акценты на границах чанков):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

Примечание: `bloxdChunkSize` — это `i32`; при смешивании с плавающими числами приводите его через `f32(bloxdChunkSize)`.

## См. также

- [Функции](functions.md) · [История версий: v3](../history/v3.md) (где появились `bloxdPi` / `bloxdTau`)
