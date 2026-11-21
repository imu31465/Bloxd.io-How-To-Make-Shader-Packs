# 着色器包格式

> 目标 API：5 · 类型：API 参考

本页汇总清单、ZIP 压缩包限制和包 uniform。设置步骤请参阅[入门指南](../getting-started/manifest.md)。

## pack.json

将 `pack.json` 放在 ZIP 压缩包的根目录。它必须是 JSON 对象。

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `apiVersion` | number | 是 | 设置数字 `5`。不接受字符串 |
| `name` | string | 是 | 去除首尾空格后非空的名称 |
| `author` | string | 否 | 作者名称 |
| `keepCircleShadows` | boolean | 否 | 设置为 `true` 时，使用阴影 API 的同时保留传统圆形阴影 |

## 加载器限制

| 项目 | 上限 |
|---|---:|
| 每个包的 `.wgsl` 文件数 | 256 |
| `.wgsl` 源码总量 | 256 KB |
| `pack.json` | 64 KB |
| ZIP 压缩包 | 32 MB |
| ZIP 条目数 | 1,024 |

不支持分卷 ZIP、Zip64、加密条目或不受支持的压缩方式。所有文件均应使用 UTF-8 编码，压缩包内不得包含重复路径。

## 包 uniform

包 uniform 大小为 80 字节，绑定在 `@group(3) @binding(0)`。

| 偏移 | 字段 | 类型 |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

uniform 的最小绑定大小为 80 字节。组 3 的其他绑定是 Liquid 变体使用的场景深度纹理，以及 `bloxdSpTextureLayers` 存储缓冲区。

## 相关页面

- [创建清单](../getting-started/manifest.md)
- [API 参考](./)
- [API v5 迁移指南](../history/v5.md)
