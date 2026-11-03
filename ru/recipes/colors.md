# Цвета

> Целевой API: 5 · Целевой билд: `ab90qa` (2026-11-03, прод) · Статус: Verified (портировано под текущий API — рекомендуется перепроверить на устройстве)

## Один оттенок (самое базовое)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

## Буст / срез насыщенности

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 живее / -1.0 полный монохром
```

## Цветовая температура (тёплый ⇄ холодный)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = тепло (сильнее красный), -1.0 = холод (сильнее синий)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

## Винтаж / сепия

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

## Градиент высоты (тёплые низины)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 на высоте 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

## Покраска по ориентации грани (верх = светлее, стены = темнее)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // пол 1 / стена 0 / потолок -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // стены и потолки чуть темнее
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

## Постеризация (меньше цветов)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```
