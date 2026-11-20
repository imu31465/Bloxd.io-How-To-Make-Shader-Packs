# エンジンデータ台帳

> 対象API: 5 · 対象ビルド: `bbb6l5` (2026-11-20、本番・preprodで確認) · 検証状況: Verified

このページでは、現行ビルドで確認したシェーダーパック向けの仕様値をまとめます。ビルド内部のチャンク番号やモジュール配置はAPI仕様ではないため、ここには掲載しません。

## 現行仕様

| 項目 | 現行値 |
|---|---|
| `apiVersion` | `5` (数値との厳密比較) |
| エンジンヘッダー | 216 行。全文は[エンジンヘッダー](engine-header.md)を参照 |
| フック | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| バリアント | 6 (strict × terrain / liquid / model) |
| マクロ | `BLOXD_STRICT`、`BLOXD_ALPHA`、`BLOXD_SCENE_DEPTH`。`BLOXD_LIGHTING` は v5 で廃止 |
| パック uniform | 80 バイト。詳細は[パック形式](../api/pack-format.md)を参照 |
| uniform の配置 | `seconds` @0、`lit` @4、`renderOffset` @16、`sunDirection` @32、`eyePosition` @48、`shadowDirection` @64 |
| テクスチャアトラス | 1,650 レイヤー、7 ストリップ |
| 利用可能なテクスチャ名 | 1,017 |
| テクスチャエイリアス | 776 |
| 回転ファミリ | 64 |
| アニメーションファミリ | 71。連続フレーム間の遷移用綴りも含む |
| テクスチャレジストリの指紋 | `32451195` (出荷済みの事前構築アトラスと一致) |
| 予約識別子 | `/^bloxd/i` に一致する名前。エンジン内部の `bloxdSp*` 予約シンボルは 88 個 |
| ゲーム定義 | 119 |
| シェーダーパック許可リスト | 12 タイトル、28 エントリ。タイトル一覧は[適用ポリシー](policy.md)を参照 |
| デフォルトパックテンプレート | 1,633 バイト |
| ローダ制限 | 256 個の WGSL ファイル / 合計 256 KB / `pack.json` 64 KB / ZIP 32 MB / 1,024 エントリ |

## 直近の変更

`bbb6l5` では、APIバージョンを変えずにシャドウAPIが追加されました。

- `bloxdShadow()` と `bloxdAirShadow(t)` が、エンジンの太陽・月の影をシェーダーに公開
- `bloxdShadowDirection()` が影を落とす光の方向を返す
- `BloxdPackInputs` に `shadowDirection: vec3f` が加わり、uniform は 64 バイトから 80 バイトに拡張
- `pack.json` に任意の boolean フィールド `keepCircleShadows` が追加
- テクスチャアトラスは 1,227 から 1,650 レイヤーへ増加。利用可能な名前は 906 から 1,017 になり、回転・アニメーションファミリも更新
- `v98qt8` で発生したテクスチャ定数の畳み込み不具合は修正済み

詳細なビルド間の変化と測定根拠は[リサーチログ](research-log.md)と[テクスチャレジストリの内部](texture-registry.md)にまとめています。

## 過去バージョン

- v4 の仕様と計測値: [API v4 移行ガイド](../history/v4.md)
- v3 の仕様と計測値: [API v3 移行ガイド](../history/v3.md)
- ビルドごとの調査記録: [リサーチログ](research-log.md)

## 関連

- [エンジンヘッダー](engine-header.md) — 現行ヘッダー全文
- [適用ポリシー](policy.md) — ゲーム別の allow / strict
- [テクスチャレジストリの内部](texture-registry.md) — テクスチャ名とIDの対応
