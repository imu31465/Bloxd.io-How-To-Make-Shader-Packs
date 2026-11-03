# ライティングの問題

> 対象API: 5 · 検証状況: Verified

明るさ・影・フォグの不具合です。

## 洞窟が明るすぎる

- **原因**: `skyLight` の非線形カーブが不足している
- **解決方法**: [洞窟を真っ暗に](../recipes/lighting.md) の非線形暗化、または [非線形暗化 + 灯りの保護](../recipes/realism.md)

## 夜なのに照らされた面だけ明るすぎる

- **原因**: 影の色だけを暗くして、完成色には夜間減衰をかけていない
- **解決方法**: 影の色調ではなく完成色全体に減衰を適用し、局所光 (`blockLight` / `heldLight`) だけ減衰を緩和する ([夜間表現の設計](../guides/night.md))

## 夜が暗すぎる

- **解決方法**: 最小環境光を確保する。`bloxdSunDirection()` がゼロのときは真の月方向が不明なため、青い環境光などの擬似表現を用いる ([夜の青い環境光](../recipes/lighting.md))
- **補足**: 月の方向自体は `-bloxdSunDirection()` で得られる (昼夜サイクルワールド限定)

## 昼間が白飛びする

- **解決方法**: ACES 前の露出を下げる ([ACES フィルミック](../recipes/realism.md))

## 松明の周りがオレンジだらけ

- **解決方法**: 暖色ブレンドの比率を下げる (素の色つき光を残す) ([暖色トーチ × 冷色空光](../recipes/realism.md))

## エンジンのワールド光を保ちたいのに結果が変わる

- **v5 の解決策**: `bloxdWorldLight(light)` をそのまま呼ぶ — エンジン自身の「block/sky/held の最明値、ambientLightColour を下限」と同じ計算 ([ライティングAPI](../api/lighting.md#bloxdworldlight--ワールドの光))
- **注意**: `blockLight` / `heldLight` は `!bloxdLit()` で 0、`skyLight` と光の色は 1 になる (ヘッダー保証)

## ライティング無効のゲームで見た目がおかしい

- **原因**: ライティング有効時だけ意味のある入力 (`blockLight` 等) をガードせず使っている。v5 では `#ifdef BLOXD_LIGHTING` は廃止 — **実行時の `bloxdLit()`** で分岐する
- **解決方法**: `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` の早期 return を入れる ([ライティングAPI](../api/lighting.md#bloxdlit--ライティングのゲート))

## `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk`

- **症状**: コンソールにこの警告が出て、発光集中部のライトが欠ける
- **原因**: 発光ブロックが密度の高い領域・領域渡りで光のシードキューが溢れ、そのチャンクのライト計算が途中で打ち切られた。**パック由来ではない**が、発光集中部のライト欠けはこの仕様が原因
- **解決方法**: ワールド側で光源を分散させる

## 影・フォグの原理を確認したい

- 影: [影の表現](../guides/shadows.md) — skyLight = ボクセル影マップ
- フォグ: [エンジン内部: Fog Internals](../internals/fog-internals.md) — linear 固定・地平線専用の実測

## 関連

- [ライティングAPI](../api/lighting.md) — 入力の保証と処理順序
- [視覚の問題](visual.md) — 白濁・白飛び系
- [エンジン内部: Lighting Internals](../internals/lighting-internals.md)
