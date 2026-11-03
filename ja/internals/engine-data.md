# エンジンデータ台帳 (v5 計測値)

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03、本番 = preprod、バイト同一) · 検証状況: Verified

本ドキュメントの計測台帳の v5 行 — すべて `ab90qa` で計測した確定値の一覧です。

## 台帳

| 項目 | 値 |
|---|---|
| `apiVersion` | `5` (厳密 `===`、数値) |
| エンジンヘッダー | デコード後 8,954 B / 208 行 (出荷形態 9,125 B、補間 6 個)。1 行目 `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — 全文は [Engine Header](engine-header.md) |
| フック | 9 (terrain/liquid/model × vertex/surface/light)。名前は不変。デフォルトテンプレートが 9 つすべてを同梱 |
| バリアント | 6 (strict × program)。名前 `strict\|allow.terrain\|liquid\|model` — ライティング軸は消滅 |
| マクロ | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (全 liquid + 非 strict の terrain/model) · `BLOXD_SCENE_DEPTH` (全 liquid) · ~~`BLOXD_LIGHTING`~~ **廃止** |
| パック uniform | `@group(3) @binding(0)`、64 B: seconds@0、**lit@4 (u32、新設)**、renderOffset@16、sunDirection@32、eyePosition@48 |
| パックバインディング | group 3: 0 uniform · 1 シーン深度 (liquid) · 2 `bloxdSpTextureLayers` ストレージ |
| フラグ | `BloxdFlags` 構造体、14 bool。v4 のビット値は引退 |
| ローダ制限 | 256 `.wgsl` / 256 KB ソース / 64 KB `pack.json` / 32 MB zip / 1,024 エントリ。UTF-8、マニフェスト 1 つ、パス一意 — すべて不変 |
| テクスチャレジストリ | 1,210 エントリ → **896 利用可能名**。cnty9 比ドリフト +1/−10 ([Texture Registry](texture-registry.md)) |
| 光カーブ | 0〜15 レベル → 0〜1、ease-out カーブ (`6 → 0.45`、`12 → 0.92`) — ヘッダー内、不変 |
| リフトカーブ | `1 - (1 - x / (3 - 2x))^3` — 不変 (現在チャンク c9) |
| 方向性コーン | `0.12 / 0.65 / 0.62 / 0.95` — 不変 (チャンク c9) |
| フォグ色 | `vec3f(183/255, 191/255, 195/255)` — 不変 |
| 予約名 | `/^bloxd/i` (大小文字無視) + 46 個の `bloxdSp*` エンジンシンボル ([Reserved Identifiers](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict タイトル | [Policy](policy.md) の allow 12 タイトル以外のすべて (ab90qa で再検証、不変) |
| ヘッダー/レジストリ構築器 | チャンク c55 (module 29833 + 1371 + 1391 + 1384 + 219 協調) |
| デフォルトパックテンプレート | チャンク c116 (v4 の c124 から移動)、1,683 B |

## バンドルの配置 (再調査者向け)

シェーダーパイプラインのクラスタ: ローダ/永続化 c51〜c53、バリデータ/ヘッダー/レジストリ構築器 c55、WebGPU/コード生成 c56、フォグ c9。**デフォルトパックテンプレートは c116** (v4 では c124)。

チャンク形式の注記: 各チャンクは ES モジュール (`export const modules = {...}`) — c53 は c52 と c53 の両方のモジュールを運ぶ — なのでバンドルをテキスト検索するなら意味がある (モジュール id `1371` は *main* の疎モジュール配列にあり、どのチャンクにも無い)。

メインバンドルは 3.39 MB (v4 ビルド比 +115 KB)、チャンクマップは 195 ID (既知の 7 欠番を除き 188 個が出力)。

## 過去バージョンの台帳

- v4 (cnty9、2026-10-27) の台帳 → [Version History: v4](../history/v4.md)
- v3 (3ymzdd、2026-10-19) の確定値 → [Version History: v3](../history/v3.md)

## 関連

- [Research Log](research-log.md) — 計測手法
- [Engine Header](engine-header.md) — ヘッダー全文
- [Policy](policy.md) — allow/strict タイトル
