# pack.json (manifest)

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Verified

`pack.json` 是包的 manifest — zip 根部恰好一个 JSON 对象。

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `apiVersion` | number | 必填 | 必须**精确等于 `5`** (严格 `===`)。字符串 `"5"` 或任何其他类型都会失败，并按 JSON 原始写法报出 |
| `name` | string | 必填 | 去除首尾空白后非空。显示在设置界面 |
| `author` | string | 可选 | 可省略；若存在则必须是字符串 |

其余字段一律被加载器忽略。

## 版本不符时会发生什么

加载器以严格比较 `manifest.apiVersion !== 5`，**在加载瞬间即告失败**。消息逐字取自现行 i18n 字典：

- `pack.json needs "apiVersion": {{version}}.` — 键完全缺失
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — 键存在但不是 5

此前保存的旧版本包不会抛异常；它们解析为 `{kind: "none", reason: "otherApiVersion"}` 并**静默失效**。着色器包设置页会解释原因：

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

从 v1–v4 迁移请见[版本历史](../history/)。
