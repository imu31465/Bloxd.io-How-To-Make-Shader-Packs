# Реалистичные рецепты



> Физические рецепты для «пересборки ванильного вида из материалов». Сначала предпосылки:
>
> 1. **Light-хук вызывается на финальной стадии фрагмента**. Возвращённый цвет становится итоговым как есть. **Туман накладывайте сами** (R9.10)  
> 2. **Штатное освещение движка — только умножение**. Спекуляр / френель / тепло-холодное разделение / полусферическое окружение строятся с нуля  
> 3. `l.engineColour` — готовый цвет (уже с туманом). Пересборка из `s.colour` (альбедо) — основательный путь  
> 4. Текстуры запрещены → все детали только **процедурные** (hash/шум) (R9.8)

## R9.1 Тёплые факелы × холодный небесный свет

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // промежуточный clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // туман заново
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission досложить
}
    return out;
}
```

## R9.2 Солнечный спекуляр (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // половинный вектор
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

## R9.3 Френель Шлика

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // тонкая яркость кромок
}
    return out;
}
```

## R9.4 Полусферическое окружение (небо сверху / отскок земли снизу)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // снизу: отскок
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // сверху: небесный свет
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // промежуточный clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // туман заново
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission досложить
}
    return out;
}
```

## R9.5 ACES filmic (аппроксимация Нарковича)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = экспозиция
    return out;
}
```

## R9.6 Воздушная перспектива («воздух» через обесцвечивание вдаль)

> Осторожно: если применить к цвету дымки обработку, поднимающую яркость (`normalize` и т.п.), в тёмных сценах всплывает «яркий белый туман»,  
> а добавление цвета тумана поверх engineColour (уже с туманом) даёт двойной туман и белесость. **«Воздух» выражайте только снижением насыщенности** — это безопасно.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // затухание (~30% на 100blk / ~75% на 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // только saturation вниз (luminance цел)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

## R9.7 Волновые нормали + солнечный глиттер («солнечная дорожка» на воде)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // высота h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 Процедурный микробамп (обход запрета текстур)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // локальные координаты блока
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 Нелинейное затемнение пещер + защита ламп

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // приподнимаем места с лампами
        out.colour *= mix(keep, 1.0, sky * sky);     // нелинейное (квадратичное) затемнение
}
    return out;
}
```

## R9.10 Переналожение тумана (обязательно при отбросе engineColour)

> Полом вида `min(l.fogAlpha, 0.75)` задаёт «плотнее этого не будет»  
> (0.0 = как у движка / 0.3–0.5 = дали чище).  
> Учтите: туман движка — линейный только у горизонта (вблизи дальности прорисовки); среднюю дымку стройте паком.
> Реальные настройки тумана (сверены с реализацией): linear фиксирован / `fogStart` = дистанция чанков / `fogEnd` = +1 чанк / при выключенном тумане 100–101 чанков, фактически выключен / дефолтный цвет RGB (183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // туман заново (0.15 = лёгкий пол)
        col += s.emission * (1.0 - l.fogAlpha);            // emission тоже с туманом
        out.colour = col;
}
    return out;
}
```

## R9.11 Кино-грейд (холодные тени / тёплые света / ночное обесцвечивание)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // ночь только при нулевом направлении солнца; сумеречного градиента нет
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 Проекционные тени — инверсия лифта + пороговый срез (финал)

> **Перепроверка предпосылки (раздел 10)**: `l.skyLight` — не сырое воксельное значение (n/15), а значение после движковой «lift-кривой»  
> `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места).
>
> | Место | сырой воксель | поднятое (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | открытое небо | 1.00 | 1.00 | 1.00 |  
> | под деревом (радиус 2) | 0.87 | **0.97** | **0.86** ← почти цело |  
> | радиус 3 | 0.80 | **0.92** | 0.66 |  
> | радиус 5 | 0.67 | 0.78 | 0.29 |
>
> **Это доказанная первопричина «тени не углубляются никакой гаммой»**. Но кривая монотонна, значит алгебраически строго обратима:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Восстановив сырые значения, остаётся лишь бинаризовать пороговым срезом (`smoothstep`).  
> BFS-распространение LightEngine — «1 блок = -1», так что порог `th = 1 - r/15` напрямую крутит  
> «затенение радиуса r и больше считать тенью». Ломаете блоки — тени двигаются сразу (LightEngine пересчитывает в реальном времени).  
> Ограничение: тени опираются на «небо сверху», поэтому за солнцем не вращаются (раздел 15 «Правда о тенях»).

```wgsl
// Точно инвертируем лифт движка, восстанавливаем сырой воксельный skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // cbrt в WGSL нет, берём pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // крутилка радиуса тени: th = 1 - r/15 (0.87 = радиус 2+ это тень)
const shSoft = 0.04;   // мягкость кромки (0.02 = жёстко / 0.08 = мягко)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. восстанавливаем сырые значения (пропустите — теней не будет никогда)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. пороговый срез — чисто разделяем солнце=1 / тень=0
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // солнечный Ламберт (без солнца — fallback на l.directional)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // суть проекции: прямое солнце достаёт только туда, где видно небо
        let lit = sunL * sky;
        // теневая сторона: подкрашена небом, не чёрная + минимальный ambient
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // свет факела пробивает тени (blockLight тоже поднят: восстанавливаем вместе)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // туман заново (доля отброшенного engineColour)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission тоже не забудьте (с туманом)
}
    return out;
}
```

> Гайд по настройке: **площадь тени решает только `shTh`** — `0.93` = радиус 1.5+ / `0.87` = радиус 2 / `0.80` = радиус 3 / `0.67` = радиус 5.  
> Жёсткость кромки — это `shSoft` (0.02 = жёстко / 0.08 = мягко). Темнота ядра — двухточечный сдвиг `0.09` (минимальный ambient) и `0.16` (рассеянный свет неба).  
> Чтобы расширить тени к вечеру, добавьте `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (приближение длинных вечерних теней.  
> `sunDir` — это `bloxdSunDirection() / length(bloxdSunDirection())`). Для более синих теней поднимите B в `vec3f(0.72, 0.82, 1.05)`.
>
