# Координаты

> Целевой API: 5 · Целевой билд: `ab90qa` (2026-11-03, прод) · Статус: Verified (портировано под текущий API — рекомендуется перепроверить на устройстве)
## Мировые координаты

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## Координаты блока

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## Шахматка (поблочно)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 или 1
out.colour *= mix(0.96, 1.04, checker);
```

## Поблочный псевдорандом (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// применения: вариации цвета травы, пятнистость камня и т.д.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## Вектор взгляда и rim-подсветка

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## Угол взгляда (френелевский вид — для жидкостей)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 в лоб / 0 по касательной
let fresnel = pow(1.0 - facing, 3.0);
```
