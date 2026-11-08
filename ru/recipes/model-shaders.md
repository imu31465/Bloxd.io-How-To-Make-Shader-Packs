# Шейдеры моделей

> Целевой API: 5 · Целевой билд: `v98qt8` (проверено в проде 2026-11-08) · Статус: Analyzed (написано по спецификации заголовка v5)

Рецепты на Model-хуках v5 и новых флагах для **отборов «на что я смотрю», которые до v5 были невозможны**. Основы: [Модели и текстуры](../guides/models.md).

## Свечение предмета в руках

То, чего авторам шейдеров от первого лица хотелось с v1, — в две строки:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Отделение мира от руки

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Светящиеся кончики клинков (localPosition)

`localPosition` вращается вместе с моделью — «где я на модели» без гаданий в мировых координатах:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

Примечание: фактические диапазоны `localPosition` зависят от модели — проверяйте на устройстве и применяйте `clamp` на всякий случай.

## Подсветка выпавших предметов

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## Холодный rim на скинах игроков (lifeform)

Большинство моделей использует `textureId: 0` (скины); `surface.colour` уже содержит скин × тинт:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## Растения, качающиеся на ветру (только allow)

Растения (`flags.flat`) рисуются как модели — покачивание через vertex-хук:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(Растительность — это ещё и `flags.vegetation`: `flat` = «нарисовано скрещенной плоскостью», `vegetation` = «является растением» — трава и цветы подходят под оба.)

## Только грани моделей с текстурой атласа

Грани блочных моделей (полублоки, ступени…) несут `textureId` атласа; отбирайте условием `textureId != 0u`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

Грани с `textureId: 0` (скины) сэмплятся как белые — без ошибки ([текстуры, принадлежащие модели](../api/texture-api.md#собственные-текстуры-моделей-textureid-0)).

## Броня против остального

`flags.lifeform` включает броню и косметику ([Флаги](../api/flags.md)). Входа с более тонкой гранулярностью не существует; комбинируйте `localPosition` (размещение) или наличие `overlayColour` как практические приближения.

## Совместное использование с террейном

Единый грейдинг на полные блоки и блочные модели:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

Паттерн общей функции — как раз то, что рекомендует сам дефолтный шаблон пака ([хуки](../getting-started/hooks.md#fallback-и-разделение-кода)).

## См. также

- [Модели и текстуры](../guides/models.md) · [Эффекты зачарования](enchant-effects.md) · [Флаги](../api/flags.md) · [Структуры](../api/structures.md)
