# ライティングの仕組み

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

エンジン既定の照明が何をしているか、パックでどこまで再構築できるかの全体地図。


エンジンのデフォルト照明は `bloxdShading()` (directional × diffuse + emissive + ambient のクランプ) と `bloxdWorldLight()` (block/sky/held の最明値) の乗算構成であり、スペキュラ・フレネル・暖色/冷色の分離・半球環境光には対応していない。v5 ではこのレシピが [`bloxdLitColour()`](../api/lighting.md) としてそのまま呼べる。以下に、再構築可能な範囲を示す。

| 機能 | デフォルト | パックで対応可能? |
|---|---|---|
| 拡散 (Lambert) | `bloxdShading()`: directional × diffuse + emissive + ambient | ◎ `bloxdSunDirection()` や `light.diffuse` を用いて自前実装 (ラップ光源など) |
| スペキュラ (鏡面反射) | 非対応 | ◎ Blinn-Phong ([スペキュラ](../recipes/realism.md)) |
| フレネル | 非対応 | ◎ Schlick 近似 ([フレネル](../recipes/realism.md)) |
| 暖色トーチ / 冷色空光の分離 | 無色のまま | ◎ ([暖色トーチ×冷色空光](../recipes/realism.md)) |
| 半球環境光 | 方向性なし | ◎ 上=空色 / 下=地面色 ([半球環境光](../recipes/realism.md)) |
| トーンマップ | なし (クランプのみ) | ◎ ACES フィルミック ([ACES](../recipes/realism.md)) |
| 大気遠近法 | フォグ (色置換) のみ | ◎ 距離に応じた彩度低下 ([大気遠近法](../recipes/realism.md)) |
| 表面ディテール | テクスチャ解像度に依存 | △ ハッシュノイズによるマイクロバンプ ([マイクロバンプ](../recipes/realism.md)) |
| 頂点波 (水面) | なし (平面) | ◎ allow 限定 ([頂点のレシピ](../recipes/vertices.md)) |
| 波法線 / 太陽グリント | 非対応 | ◎ ([波法線+グリント](../recipes/realism.md)) |
| 影 (スカイ遮蔽シャドウ) | `mix(環境色, 空色, skyLight)` で緩やかに混合 | ◎ リフト逆変換 + しきい値カット + 太陽ゲート ([投影風シャドウ](../recipes/realism.md))。木陰や屋根下が明確に反応し、ブロック編集にリアルタイム追従 |
| 夜の月光処理 | 空色が暗くなるだけ | △ 月の方向は入力にないため、方向性を持つ月光は不可。青い環境光や彩度低下による擬似表現のみ ([夜の青い環境光](../recipes/lighting.md) / [シネマgrade](../recipes/realism.md)) |

## 関連

- [ライティングAPI](../api/lighting.md) — v5 で公開された照明関数
- [リアル系レシピ](../recipes/realism.md) — 実装例
- [Engine Internals: Lighting Internals](../internals/lighting-internals.md)
