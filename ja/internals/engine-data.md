# エンジンデータ台帳

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Verified

本ドキュメントの計測台帳 — 現行対象ビルド `v98qt8` で計測した確定値の一覧です。

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
| テクスチャレジストリ | 1,210 エントリ → **896 利用可能名**。cnty9 比ドリフト +1/−10 ([テクスチャレジストリの内部](texture-registry.md)) → `xkg8x` (2026-11-04): 1,220 / **906** → `bny9u` (2026-11-05): 1,232 / **911** → `v98qt8` (2026-11-08): 1,227 / **906 利用可能名** — +1 `hay_block_top`、−6 モデル化ブロックテクスチャ (Furnace・Workbench・Artisan Bench)、716 件の id 変化。**畳み込みリグレッション** — エンジンは 1,047 の未畳み込み名を解決 ([テクスチャレジストリの内部](texture-registry.md#the-v98qt8-folding-regression)) |
| 光カーブ | 0〜15 レベル → 0〜1、ease-out カーブ (`6 → 0.45`、`12 → 0.92`) — ヘッダー内、不変 |
| リフトカーブ | `1 - (1 - x / (3 - 2x))^3` — 不変 (現在チャンク c9) |
| 方向性コーン | `0.12 / 0.65 / 0.62 / 0.95` — 不変 (チャンク c9) |
| フォグ色 | `vec3f(183/255, 191/255, 195/255)` — 不変 |
| 予約名 | `/^bloxd/i` (大小文字無視) + 46 個の `bloxdSp*` エンジンシンボル ([Reserved Identifiers](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict タイトル | [Policy](policy.md) の allow 12 タイトル以外のすべて (v98qt8 で再列挙: ゲーム定義 116、allow エントリ 28 — 同じ 12 タイトル、88 strict) |
| ヘッダー/レジストリ構築器 | ヘッダーモジュール 30052 はチャンク c63 (分類器 30048 は c59/c60/c61/c9)、アトラス/レジストリ構築器 module 28312 はチャンク c49、データ module 1351 は main。`bny9u` ではヘッダー 29815 (c56)・構築器 29812 (c52〜c54) だった |
| デフォルトパックテンプレート | チャンク c131 (`bny9u` では c122、`xkg8x` では c116、v4 では c124)、1,633 B — `bny9u` とバイト同一 |

## バンドルの配置 (再調査者向け)

`v98qt8` でのシェーダーパイプラインのクラスタ: ローダ (zip/manifest/制限、module 33165) とアトラス/レジストリ構築器 (28312) は c49、ヘッダー/apiVersion モジュール 30052 は c63、分類器 30048 は c59/c60/c61/c9、バリデータ/コンパイルは c61〜c63、デフォルトパックテンプレートは **c131**、フォグは c9。`bny9u` ではローダ 32942・構築器 c52〜c54・バリデータ/ヘッダー c56・WebGPU/コード生成 c57 だった。

チャンク形式の注記: 各チャンクは ES モジュール (`export const modules = {...}`) — c53 は c52 と c53 の両方のモジュールを運ぶ — なのでバンドルをテキスト検索するなら意味がある (モジュール id `1351` は *main* の疎モジュール配列にあり、どのチャンクにも無い)。

メインバンドルは 3,583,101 バイト (3.58 MB、md5 `7458fd47ff88331d9f451d1456ff48ac` — 本番と preprod でバイト同一)。チャンクマップは 212 ID へ増加 (c0〜c212。c0〜c7 はサーバー上 404 の死亡マップエントリで、205 チャンクが出荷されている)。

## 過去バージョンの台帳

- v4 (cnty9、2026-10-27) の台帳 → [バージョン履歴: v4](../history/v4.md)
- v3 (3ymzdd、2026-10-19) の確定値 → [バージョン履歴: v3](../history/v3.md)

## 関連

- [リサーチログ](research-log.md) — 計測手法
- [Engine Header](engine-header.md) — ヘッダー全文
- [Policy](policy.md) — allow/strict タイトル
