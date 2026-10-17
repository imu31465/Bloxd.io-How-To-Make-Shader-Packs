[← 前の部](4-realism.md)・[マニュアルに戻る](README.md)・[次の部 →](6-implementation.md)

# 第五部: トラブルシューティング・注意

## 17. よくあるエラーと直し方

| 症状 | 直し方 |
|---|---|
| strict のゲームで読み込めない | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `.alpha` が未定義と言われる | `#ifdef BLOXD_ALPHA` で囲む |
| `blockLight` が未定義と言われる | `#ifdef BLOXD_LIGHTING` で囲む。共用ヘルパー関数は**関数ごと**囲む (v2 ではフィールド常在のため通常は起きない。判定用途のガードは残す) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` を起点に書き換える |
| `pack.json needs "apiVersion": 2.` | `apiVersion` が無いか `2` でない。数値の `2` を入れる (文字列の `"2"` は不可)。v1 パックは `shaderPack:loadWrongApiVersion` で拒否される |
| `There's no pack.json at the top of the pack.` | ZIP直下に `pack.json` が無い。フォルダごと固めていないか確認する |
| `bloxdTerrainVertex must be declared as: fn ...` | シグネチャ不一致。表示された宣言どおりに書き直す |
| `bloxdTerrainVertex can't run in strict games...` | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` で囲む (v2 ではフィールド常在のため通常は起きない) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` で囲む |
| `pow(l.skyLight, γ)` をいくら上げても影が濃くならない | `skyLight` はエンジンのリフト曲線通過後の値 (生値 0.87 が 0.97 で届く)。R9.12 のリフト逆変換 + しきい値カットに切り替える (10章) |
| `... can only be a function's parameter or return type, ...` | 未初期化の `var x: BloxdSurface;` は不可。`bloxdDefault*` から作る |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform はパックから直接参照不可。`bloxdTime()` 等のヘッダ関数経由で使う |
| `Packs can't declare bloxd_ names...` | 自分の識別子から `bloxd_` 接頭辞を外す。定義できるのは 6 つのフック名だけ |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` 等を起点に書き換える。light フック第 1 引数のコピー `var out = s;` から始めるのも可 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` は不可。`_ = f();` と書く |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 地形フック内の `bloxdOpaqueBehind()` 呼び出しを `#ifdef BLOXD_SCENE_DEPTH` で囲む |
| `...only surface and light hooks can use.` | vertex フック内の `bloxdOpaqueBehind()` を消す (surface / light のみ可) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | エラーではなく strict ゲームでの自動無効化 (`shaderPack:offInStrict`)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 第2段階 (ブラウザ Tint) のエラー。`^` `&` `\|` `<<` `>>` のオペランドは括る (§38) |
| zip 読み込みで `loadDuplicateManifest` | `pack.json` が 2 つある (大文字小文字違いも含む)。1 つにする |
| 遠景が白く濁る | フォグの二重掛けが原因のことが多い。完成色はフォグ済みなので独自の霧色は控えめに、彩度だけ落とす方式を検討する |
| ゲーム参加時にパックが除外される | ゲーム開始時の実機チェックで失敗している。ガード漏れを見直す |

## 18. 権利・注意

- シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パック制作は想定内の行為と考えられる。ただし公開公式ドキュメントは確認できていない
- パックは純粋な WGSL であり、JS 実行・ネットワークアクセスは設計上不可能
- 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる
