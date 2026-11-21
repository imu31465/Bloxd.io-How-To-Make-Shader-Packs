# Pack format

> Target API: 5 · Type: API reference

This page summarizes the manifest, ZIP archive limits, and pack uniform. For setup instructions, see [Getting started](../getting-started/manifest.md).

## pack.json

Place `pack.json` at the root of the ZIP archive. It must be a JSON object.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `apiVersion` | number | Yes | Set the numeric value `5`. A string is not accepted |
| `name` | string | Yes | A non-empty name after trimming surrounding whitespace |
| `author` | string | No | Author name |
| `keepCircleShadows` | boolean | No | Set to `true` to retain the traditional circular shadows while using the shadow API |

## Loader limits

| Item | Limit |
|---|---:|
| `.wgsl` files per pack | 256 |
| Total `.wgsl` source | 256 KB |
| `pack.json` | 64 KB |
| ZIP archive | 32 MB |
| ZIP entries | 1,024 |

Split ZIP archives, Zip64, encrypted entries, and unsupported compression methods are not supported. Save all files as UTF-8 and do not include duplicate paths in the archive.

## Pack uniform

The pack uniform is 80 bytes and is bound at `@group(3) @binding(0)`.

| Offset | Field | Type |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

The minimum uniform binding size is 80 bytes. The other bindings in group 3 are the scene-depth texture for liquid variants and the `bloxdSpTextureLayers` storage buffer.

## Related

- [Creating the manifest](../getting-started/manifest.md)
- [API reference](./)
- [API v5 migration guide](../history/v5.md)
