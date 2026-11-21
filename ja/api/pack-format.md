# パック形式

> 対象API: 5 · 種別: API リファレンス

マニフェスト、ZIPアーカイブの制限、パックuniformの構成をまとめます。作成手順は[はじめに](../getting-started/manifest.md)を参照してください。

## pack.json

`pack.json` はZIPのルートに置くJSONオブジェクトです。

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `apiVersion` | number | 必須 | 数値の `5` を指定します。文字列は使用できません |
| `name` | string | 必須 | 前後の空白を除いて空でない名前 |
| `author` | string | 任意 | 作者名 |
| `keepCircleShadows` | boolean | 任意 | `true` にすると、シャドウAPIを使う場合も従来の円形影を残します |

## ローダーの制限

| 項目 | 上限 |
|---|---:|
| `.wgsl` ファイル数 | 256 |
| `.wgsl` ソース合計 | 256 KB |
| `pack.json` | 64 KB |
| ZIPアーカイブ | 32 MB |
| ZIP内エントリ数 | 1,024 |

分割ZIP、Zip64、暗号化エントリ、未対応の圧縮方式は使用できません。すべてのファイルをUTF-8で保存し、ZIP内のパスを重複させないでください。

## パック uniform

パックuniformは80バイトで、`@group(3) @binding(0)` にバインドされます。

| オフセット | フィールド | 型 |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

uniformの最小バインドサイズは80バイトです。グループ3には、このほかに液体バリアント用のシーン深度テクスチャと、`bloxdSpTextureLayers` ストレージバッファがあります。

## 関連

- [マニフェストの作成](../getting-started/manifest.md)
- [APIリファレンス](./)
- [API v5移行ガイド](../history/v5.md)
