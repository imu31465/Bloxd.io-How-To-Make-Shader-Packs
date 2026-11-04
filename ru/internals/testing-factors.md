# Что меняет видимые паком значения

> Целевой API: 5 · Целевой билд: `xkg8x` (2026-11-04, прод) · Статус: Analyzed (анализ JavaScript продакшн-бандла)

Один и тот же пак рендерится по-разному в зависимости от **мира и настроек игрока**. Перед распространением проверьте хотя бы эти 3 окружения:

1. **Обычный мир** (дефолтный скайбокс, без оверрайдов) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, дефолтные цвета
2. **Мир со space-скайбоксом** — bloxdSunDirection() = 0. Вид ветки `sunPresent`
3. **Кастомный мир с `visionMinLightColour` / `skyLightColourOverride`** — поднятые темноты и цвета

Главные источники вариации: `lightingOverride` (принудительный свет) / `skyLightColourOverride`, `ambientLightColourOverride` (hex-замены) / `visionMinLightColour` (минимальный цвет видимости; реализация — покомпонентный max в обе стороны на `uSkyLightColour` и `uAmbientLightColour`; использует Night Vision. Паки «кромешная пещера» темнее задуманного не станут — пол приподнимает и сам цвет неба) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (есть ли bloxdSunDirection()). `uSkyLightColour` дефолт = (1,1,1) белый, `uAmbientLightColour` дефолт = (0.25,0.25,0.30). Сценовая сторона `l.ambient` = графическая настройка «Ambient Lighting Intensity» (дефолт 0.5). `(1.0 - l.fogAlpha)` следует настройкам тумана/дистанции чанков игрока. Кроме того, на вариации влияют `cameraTint` (RGBA-тинт всего экрана) и `proximityFadeDistance` / `proximityFadeMinOpacity` (подсвечка fade сущностей у камеры), причём `cameraTint` — финальный слой поверх вывода пака. Многие из них настраиваются и через скриптовый API (`serverOption`) и могут обновляться прямо во время игры.
