# Combining with texture packs

> Target API: 5 · Target build: `v98qt8` (2026-11-08, production and preprod) · Status: Verified (ported to the current API — on-device re-check recommended)
Since shader packs cannot add or sample textures, don't try to solve fine material bumpiness or sky image changes with shaders alone. The public texture-pack repository for Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) handles textures, skybox, models, etc. through a different system.

For reference, community "cinematic shader" distributions analyzed in one case turned out to be texture packs (128x128 textures with no `pack.json` / `.wgsl`).

In practice, **tune light and color with shaders, and cover materials and sky with a matching resource pack**. But verify co-use and load order against the game's implementation and settings.

Texture packs have their own spec (for reference): the size limit is 25MB measured as the base64-encoded JSON string length; base64-encoding a PNG inflates it by +33%, so the practical ceiling for raw images is ~18–19MB. CSS is processed by a simple regex-based parser — avoid nesting and comments.
