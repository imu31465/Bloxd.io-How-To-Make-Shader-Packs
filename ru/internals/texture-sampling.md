# Внутрянка сэмплинга текстур

> Целевой API: 5 · Целевой билд: `ab90qa` · Статус: Analyzed (восстановлено из живого генератора, c56)

Как `bloxdTexel` / `bloxdTextureSize` компилируются на самом деле — кодогенерация текстур в 3 вариантах. Со стороны пользователя: [API текстур](../api/texture-api.md).

## Три варианта

### Вариант 1 — текстурный пак неактивен (заглушки)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

Код, написанный под настоящий атлас, и здесь компилируется и выполняется — он просто видит белые текселы и размер 1×1.

### Вариант 2 — путь через атлас (дефолт игры)

`bloxdTextureSize` возвращает `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`. `bloxdTexel` применяет четверть оборота грани перед загрузкой — ловушка поворота, записанная как сгенерированная if-цепочка `bloxdSpTurned`:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` — собственное хранилище движка для входного поля `textureRotation`.)

### Вариант 3 — текстуры кастомных текстурных паков

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` сэмплит ячейку слоёного атласа, отведённую конкретной текстуре; собственные текселы пака идут путём `bloxdSpOwnTexel`.

## Лестница кадров анимации

Анимированные текстуры (42 семейства) продвигаются с фиксированными для каждого семейства интервалами (200 / 250 / 300 мс — колонка интервалов в [каталоге текстур](../api/texture-catalog.md#семейства-анимации-42-имени)). Передача id семейства анимации в `bloxdTexel` сэмплит текущий кадр.

## Настройки сэмплера

Блочные текстуры — это `texture_2d_array`; сэмплер террейна — nearest + repeat.

## Greedy meshing и UV

Мешер склеивает грани с совпадающими материалом/AO/светом в одиночные прямоугольники (**greedy meshing**), поэтому вершинные UV на слитых гранях могут выходить за ширину тайла (инсет 0.0015 по краям). Аппаратный repeat-адресинг обслуживает тайлинг, поэтому слитые грани выглядят бесшовно — но процедурная деталь, привязанная к `uv`, может расходиться на границах слияния; привязывайте зависящие от мира эффекты к `bloxdWorldPosition(position)`.

## См. также

- [API текстур](../api/texture-api.md) · [Реестр текстур](texture-registry.md) · [Пайплайн рендеринга](rendering-pipeline.md)
