# 概要と前提

## シェーダーパックとは

Bloxd.io のシェーダーパックは、ゲームの **WebGPU レンダラー専用**の見た目変更機能です。パックは **WGSL (WebGPU Shading Language) の制限付きサブセット**で記述し、ゲーム内の設定 → Shader Pack から zip またはフォルダとして読み込みます。パック導入中は設定の WebGPU レンダラーが強制的にオンになります。

パックのコードは WGSL として検証・コンパイルされます。パック内の WGSL から JavaScript を実行したり、ネットワーク通信を行ったりすることはできません。

## 何を変更できるか

シェーダーパックが差し込めるのは、レンダラーが各面を描くときの **3段階パイプライン**です。対象は3つに分かれ、合計 **9つのフック** になります:

| 対象 | フック (Vertex / Surface / Light) | 何が描かれるか |
|---|---|---|
| **Terrain (地形)** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | 水とブロックモデル以外のすべてのブロック |
| **Liquid (液体)** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | 水 |
| **Model (モデル)** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | ブロックモデル (ハーフブロック・階段・植物等)、アイテム、プレイヤー、モブ、NPC、防具、コスメティック |

- **できること**: 色・透明度・発光の変更、ライティングの組み直し ([ライティングAPI](../api/lighting.md))、エンジンが計算する太陽・月の影 (`bloxdShadow()`、`bloxdAirShadow(t)`、`bloxdShadowDirection()`)、ブロック単位の遮蔽表現 (`skyLight`)、テクスチャのサンプリング (`bloxdTexel`)、モデル別の演出 (`flags`)、一部ゲームでの頂点移動
- **できないこと**: 独自テクスチャの追加 (テクスチャパック機構の仕事)、ポストプロセス (ブルーム等)、シャドウマップの深度データへのアクセスや独自シャドウマップの生成、本物の反射 (SSR) の新設、空・雲・太陽円盤そのものへの適用

## strict モードと allow モード

ゲームごとにシェーダーパックの適用ポリシー (`shaderPackPolicy`) が決まっており、**大多数のゲームは strict モード** (頂点移動・`discard` 禁止) です。一般配布するパックは strict で動く作りにするのが基本です。詳細は [バリアント](variants.md) と [Engine Internals のポリシー資料](../internals/policy.md) を参照してください。

## このドキュメントの前提

- 現行ゲームは `apiVersion: 5` のパックのみを受け付けます。v1〜v4 のパックは読み込み時に拒否されます (保存済みパックは暗黙に不活性化 — [互換性](../api/compatibility.md))
- 旧バージョン向けに書かれたパックの移行は [バージョン履歴](../history/) を参照
