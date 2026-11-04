# Lista de comprobación en juego

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

El éxito de compilación y el "buen aspecto" son cosas distintas. Revisa en este orden:

1. **Carga:** `pack.json` en la raíz del ZIP. Justo tras seleccionar aparece `Ready. Reload the page to use it.` y el paquete se activa **al recargar la página**; confirma después `Ready to use`. Los paquetes guardados se revalidan automáticamente en la siguiente carga de página: cada vez que la cabecera de especificación del lado del motor se actualiza, se comprueba el fingerprint del contenido de la cabecera (pasa = se mantiene tal cual / falla = se muestra como bloqueado), así que un paquete antiguo roto nunca queda activo en silencio.
2. **6 variantes:** sin omisiones de guardias de tipos en strict / allow, iluminación on / off, terreno / líquido. Aunque un juego solo use algunas condiciones, los paquetes de distribución deben asumir las 8.
3. **Día:** colores sin reventar por material (hierba, piedra, arena, madera); salto claro/oscuro natural entre caras altas y laterales.
4. **Noche:** compara los mismos materiales a plena luz pasada, sombras y cercanía de antorchas. Si solo quedan caras iluminadas, ajusta la atenuación de exposición; si todo oscurece, ajusta la protección de luz local.
5. **Agua:** mira desde arriba, ángulos rasantes, orillas, bajo el agua y de noche por separado. El comportamiento alpha y el aspecto submarino dependen del compaginado del juego — nunca juzgues desde un solo punto de vista. Bajo el agua, el velo de definición líquida cubre al frente (ver [Qué pueden y qué no pueden hacer los paquetes de sombreadores](constraints.md#realidad-submarina)), así que las diferencias del paquete se ven sobre todo en la superficie y el terreno tras el velo.
6. **Bordes y distancia:** sin saltos de olas/patrones en transiciones de chunk / origen; sin doble niebla ni bruma blanca a lo lejos.
7. **Rendimiento:** efectos pesados en hash/trig/`pow` por fragmento al mínimo. Añade detalle poco a poco y compara FPS.

## Restricciones conocidas como premisas

- Los paquetes se limitan a hooks de terreno / líquido — sin manejo de cielo, entidades o UI con el mismo código.
- No existen entradas para añadir mapas de sombras, reflejos en espacio de pantalla, refracción, bloom, etc. (la profundidad de escena se desbloquea solo para líquidos como `bloxdOpaqueBehind()` — ver [Funciones](../api/functions.md)).
- `bloxdSeconds()` es tiempo de animación sin vínculo garantizado con el día/noche del juego.
- Con `bloxdSunDirection()` cero la verdadera dirección lunar es desconocida, no "física de luz lunar" sino aproximación de ambiente. La luz lunar direccional se construye desde `-bloxdSunDirection()` (solo mundos con ciclo día/noche — [El sol y la luna](../internals/sun-and-moon.md)).
- `s.position` / `l.position` son coordenadas locales: suma `bloxdRenderOffset()` para efectos dependientes del mundo. Para patrones locales del bloque, las coordenadas locales son la herramienta intencionada.
