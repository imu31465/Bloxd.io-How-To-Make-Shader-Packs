[← Parte anterior](6-implementation.md)·[Volver al manual](README.md)·[Parte siguiente →](8-apiv2.md)

# Parte VII: Suplemento de interioridades

Especificaciones extra halladas por análisis de implementación del motor. Todo restaurado directamente del JavaScript del build de producción actual.

## 24. Identidad del sol y la luna

La fuente de `bloxdSunDirection()` es un búfer de dirección solar reescrito solo cuando cambia el tipo de skybox — el criterio no es "si el cielo tiene sol" sino **"si el skybox es tipo tierra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (cielo procedural) | No cero (defectos abajo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Siempre (0,0,0)** |

**La luna está siempre en `-bloxdSunDirection()`** (el motor calcula la posición lunar como el opuesto exacto del sol). La noche se juzga por altura solar — hay luna arriba cuando `bloxdSunDirection().y < 0` (sol bajo el horizonte). Pero en mundos por defecto el sol está estático y la luna también — solo los mundos con ciclo día/noche la ven moverse.

La dirección solar por defecto ronda `(-0.56, 0.81, -0.18)` (vector unitario de inclination = −0.2 / azimuth = 0.55, estático). Referencia práctica para predecir direcciones de brillo al probar paquetes de distribución.

Los ciclos día/noche no están integrados en el motor — inclination es un número estático que los mundos con día móvil actualizan lado juego. `bloxdSunDirection()` sigue cada actualización.

Las luces direccionales del terreno son solo 2 lámparas creadas al arrancar escena, de **dirección e intensidad fijas, sin cambio día/noche**. En corto: **ningún factor de brillo del terreno depende del tiempo. Los "looks" día/noche vienen solo del skybox y bloxdSunDirection()**, así que los paquetes que oscurecen de noche deben estimar la franja horaria desde bloxdSunDirection() (la técnica `sunPresent` de §19).

### R-A. Luz lunar direccional — moonDir = −bloxdSunDirection()

Añade Lambert blanco-azulado y especular débil solo mientras la luna está arriba. `moonUp` es 0 en mundos de sol estático por defecto: allí no pasa nada — **luz lunar que solo se activa en mundos con ciclo día/noche, luego segura**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // la luna está siempre exactamente opuesta al sol; auto-off diurno vía moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Interioridades de la niebla

El cómputo de niebla es siempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), con `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de niebla; solo D = 0 es especial con fogEnd = 5). **La banda de gradiente es de solo 32 bloques**, y `l.fogVisibility` es menos "bruma por distancia" que **distancia normalizada al borde del mundo cargado**. Varía por jugador con la distancia de carga: los efectos por distancia deben calcular `distance(l.position, bloxdEyePosition())` ellos mismos (receta R-B).

Color de niebla por defecto `rgb(183, 191, 195)` (gris azul pálido). Los creadores de mundos lo cambian vía `fogColourOverride` (hex). Con modo niebla 0 (NONE), **fogColour llega negro**. La forma estándar `mix(l.fogColour, col, l.fogVisibility)` es segura pues el color de niebla no se usa a fogVisibility 1.

Ajustar `showFog` a false empuja la niebla a 3200–3328 bloques, desactivándola de hecho (`fogVisibility ≈ 1` sigue viniendo).

### R-B. Banda de borde de carga — fogVisibility como "borde del mundo"

Enfría en silencio solo la banda de 32 bloques del borde de carga para disimular el fin del mundo (o enfatizarlo como efecto). Sin distancia autocalculada: sigue auto los ajustes de distancia de carga del jugador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margen al borde), 0 = a punto de salir del borde
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Interioridades de blockLight / heldLight

Al decodificar `aPackedLightLevels`, el motor pone a cada canal un **suelo del 35% del canal RGB más brillante**. P. ej. una "luz roja pura" se eleva a (1.00, 0.35, 0) en vértices antes de interpolación y realce. El naranja de antorcha viéndose "rosa blanquecino más que rojo" viene de aquí — ajusta la saturación de recetas de antorcha cálida (R9.1) contra este default.

La luz de mano (`heldLight`) tiene alcance según el canal más brillante (máx 15 bloques) con preproceso `dist^0.75`, el mismo suelo 35%, y `l.heldLight` es el valor **pre**-boost ambiental. Los objetos personalizados pueden fijar `spotlightRange` y ángulo de cono — un modo "haz mientras se sostiene" cuyo cono sigue a la cámara. Los paquetes no pueden saber la dirección del haz.

Los bloques personalizados pueden llevar `skyLightEmission` (0–15), que **inyecta al propio canal skyLight, aparte del BFS de blockLight**. Los paquetes estilo R9.12 que juzgan sol/sombra por umbral skyLight pueden fallar en mundos con skyLight elevado por luces artificiales. Los paquetes de distribución juzgan más robusto combinado con blockLight.

## 27. Detalles de pipeline

- **Los hooks surface corren "antes" de alphaTest**: `out.alpha` alimenta el test de descarte directamente. Los materiales cutout (hierba, hojas) permiten efectos de disolución tipo dither (receta R-C). En líquidos (mezclado) `out.alpha` es la transparencia real (receta R-D). Sin efecto en terreno opaco normal — no confundir
- **Contenido de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. El lado escena ata al ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5) — nunca programes defectos fijos
- **`bloxdTime()` es realmente `performance.now()`**: el uptime del navegador envuelto a 1 hora. Sin relación con día/noche del juego ni tiempo de mundo transcurrido. Para animar sincronizado a un reloj de juego, estima la hora desde el azimut `bloxdSunDirection()` en mundos con ciclo día/noche
- Los finos dameros en bordes de chunk al cargar son el fundido de chunk por dither Bayer 4×4 en espacio de pantalla del motor, no bugs del paquete
- **`mod` es palabra reservada**: rechazado con `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escribe restos con el operador `%`

### R-C. Disolución por dither Bayer — out.alpha controla discard

Reproduce la **misma tabla Bayer 4×4** que el motor usa en fundidos de chunk, disolviendo cutouts desde bloques bajos. discard se activa en materiales alphaTest (hierba, hojas); en líquidos es transparencia de mezcla.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod es reservado: usa el operador %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // se disuelve desde bloques bajos; mayor dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fundido de agua cercana a cámara — el alpha líquido despeja la vista

El `out.alpha` del hook líquido alimenta la mezcla directamente. Despeja solo la superficie bajo la cámara para asegurar la vista al bucear o con cámara sobre el agua.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 bloques de transparente total a normal
    #endif
    return out;
}
```

## 28. Qué cambia los valores visibles del paquete — lista de pruebas

El mismo paquete renderiza distinto según **mundo y ajustes de jugador**. Revisa al menos estos 3 entornos antes de distribuir:

1. **Mundo normal** (skybox default, sin overrides) — bloxdSunDirection() presente, colores por defecto
2. **Mundo con skybox espacial** — bloxdSunDirection() = 0. El look de la rama `sunPresent`
3. **Mundo personalizado con `visionMinLightColour` / `skyLightColourOverride`** — oscuros elevados y colores

Fuentes principales de variación: `lightingOverride` (iluminación forzada) / `skyLightColourOverride`, `ambientLightColourOverride` (cambios hex) / `visionMinLightColour` (suelo "color más oscuro visible" sobre sky y ambient; Night Vision lo usa — los paquetes "cueva a oscuras" no oscurecen lo previsto) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presencia de bloxdSunDirection()). `uSkyLightColour` por defecto = (1,1,1) blanco, `uAmbientLightColour` por defecto = (0.25,0.25,0.30). `l.ambient` lado escena = ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5). `l.fogVisibility` sigue los ajustes de niebla/distancia de chunks del jugador.

## 29. Medios de depuración

- Parámetro URL `?renderer=lite` — fuerza el renderizador Lite (`?renderer=webgl2` / `babylon` también valen)
- Parámetro URL `?vconsole` — consola en pantalla (VConsole). Útil en verificación móvil real
- La consola muestra `noa-engine v0.33.0` y `Renderer: lite from <fuente>` — revísalos primero para no diagnosticar mal la vía de render
- El renderizador WebGPU se bloquea "forzado ON" con paquete aplicado. El ajuste "Disable Block Texture Atlas" también se bloquea (el atlas queda ON), y en entornos sin WebGPU el paquete ni aplica. Base para escribir "necesita navegador WebGPU" en páginas de distribución
- La revalidación runtime por partida (`checkCompilation`) compila materiales de terreno reales en WebGPU del navegador (más estricta que la validación estática de ajustes). Los paquetes que fallan aquí se excluyen de ese juego

## 30. Modos de aplicación por juego (`shaderPackPolicy`)

Aquí queda precisado lo que significan `allow / strict` a nivel de título (cf. §7). Solo los títulos cuya definición de juego lleva de forma explícita `shaderPackPolicy: "allow"` funcionan en modo completo (hooks vertex, `discard`, `alpha` de terreno); los títulos sin valor (o con un valor distinto de allow) son estrictos: se define `BLOXD_STRICT` y el código dentro de guardas se desactiva automáticamente. El lado del paquete no puede elegir esto, así que saber qué títulos ejecutan qué es un prerrequisito de la distribución.

- Build de referencia: `szby6g.main.94a7596c.js` (despliegue en producción a fecha de 2026-10-17). Enumerando estáticamente las 111 definiciones de juego: **26 entradas allow (12 títulos) / 85 entradas estrictas**.
- allow se declara en 12 lugares: 8 literales directos en definiciones de juego y 4 variables base (`tb` / `kz` / `cb` / `Fb`); las variantes lo heredan por spread (`{...tb,...}`). Hoy no existe ninguna sobreescritura por variante (tampoco el patrón inverso padre-allow / hijo-estricto).

Los 12 títulos allow (26 entradas en total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuales**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

En el lado estricto, los casos que más confunden:

- **Superflat Creative (classic_creativeFlat) es estricto.** El nombre contiene "Creative", pero en la familia classic solo el Creative normal (`classic_creative`) es allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. son todos estrictos
- **Custom Games (customGames) es estricto.** Los efectos de hooks vertex no se disparan en juegos personalizados creados por el usuario. Para el trabajo de verificación, Test Gym es la opción segura
- Los títulos principales PvP / de servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) son todos estrictos

En los títulos estrictos el paquete sí se carga y compila, y las recetas del lado fragment como surface / light funcionan con normalidad. Lo restringido: los hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` y la `alpha` de terreno (en líquidos existe siempre).

Esta lista refleja el análisis estático del build indicado; las actualizaciones del motor pueden cambiar el reparto allow/strict. Vuelve a comprobarlo al salir versiones nuevas.
