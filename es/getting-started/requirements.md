# Requisitos

> API objetivo: 5 · Estado: Verified

## Navegador

Los shader packs son exclusivos del renderizador WebGPU. Necesitas un navegador con WebGPU:

- Navegadores basados en Chromium (Chrome / Edge / Opera etc.) — estables en escritorio
- Safari 17+ / Firefox (el soporte de WebGPU varía según la época)
- **Móvil**: el soporte de WebGPU puede estar limitado en iOS / Android. Menciónalo en la página de publicación de tu paquete

Mientras un paquete está instalado, el ajuste del juego para el renderizador WebGPU queda activado por la fuerza.

## Entorno de desarrollo

No se requieren herramientas especiales, aunque estas ayudan:

- Un editor de texto (el resaltado de sintaxis WGSL es un plus)
- Una herramienta de zip para la distribución; durante el desarrollo puedes usar la carga por carpeta (solo navegadores de escritorio)
- Las herramientas de desarrollador del navegador — los errores de compilación se muestran en la interfaz del juego y también en la consola

## Entornos de verificación en el dispositivo

Antes de distribuir, verifica en ([Validación](validation.md)):

1. Un juego en modo allow (obligatorio si usas animación de vértices)
2. Un juego en modo strict (la mayoría de los juegos son strict)
3. Una recarga de página (los paquetes guardados se revalidan automáticamente)

## Advertencia sobre parámetros de URL

Las anulaciones de renderizador que queden en parámetros de URL o en localStorage hacen que los paquetes se nieguen a arrancar — límpialas y recarga.
