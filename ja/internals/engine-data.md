# エンジンデータ台帳

> 対象API: 5 · 検証状況: Analyzed

シェーダーパックから利用できるAPIの構成をまとめます。実装の使い方は[APIリファレンス](../api/)を参照してください。

## APIの構成

| 項目 | 仕様 |
|---|---|
| APIバージョン | `5` |
| エンジンヘッダー | 216行。全文は[エンジンヘッダー](engine-header.md)を参照 |
| フック | 9種類（Terrain / Liquid / Model × Vertex / Surface / Light） |
| バリアント | 6種類（strict × terrain / liquid / model） |
| マクロ | `BLOXD_STRICT`、`BLOXD_ALPHA`、`BLOXD_SCENE_DEPTH` |
| パック uniform | 80バイト。詳細は[パック形式](../api/pack-format.md)を参照 |
| uniform のフィールド | `seconds` @0、`lit` @4、`renderOffset` @16、`sunDirection` @32、`eyePosition` @48、`shadowDirection` @64 |
| テクスチャ名 | 使用可能な名前付き定数は[テクスチャカタログ](../api/texture-catalog.md)に掲載 |

## 影に関するAPI

- `bloxdShadow()` は、エンジンが計算した太陽・月の影の係数を返します。
- `bloxdAirShadow(t)` は、カメラからフラグメントまでの区間上で影を評価します。
- `bloxdShadowDirection()` は、影を作る光の方向を返します。
- `pack.json` の `keepCircleShadows` は、従来の円形影を残すための任意フィールドです。

## 関連資料

- [APIリファレンス](../api/) — パックから使えるAPI
- [パック形式](../api/pack-format.md) — manifest、uniform、ローダ制限
- [適用ポリシー](policy.md) — ゲームごとの制約
