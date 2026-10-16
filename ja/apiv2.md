[← 前の部](internals.md)・[マニュアルに戻る](README.md)

# 第八部: API Version 2 移行ガイド

対象ビルド: `6qxffk.main.5912a15f.js` (2026-10-16 時点の本番デプロイ)。本書の第一部〜第七部は v2 基準に書き換え済みであり、この第八部は v1 からの移行点と v2 の新機能をまとめたものである。新機能のコード例は v2 コンパイラによる 8/8 バリアント検証とブラウザ WGSL コンパイラ (Tint) 検証 (§38) を通過したもので、既存レシピの v2 変換は機械的な識別子置換であるため、配布前には必ず実機コンパイルで確認すること。

## 31. v1 パックの運命 (先に結論)

ゲームは manifest の `apiVersion` が **2 と厳密一致すること**を要求する。v1 パックをロードすると `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n キー `shaderPack:loadWrongApiVersion`) で拒否される。v1/v2 の**並行サポートは存在しない**。また、エンジンは保存済みパックの `validation.headerVersion` (ヘッダ全文のハッシュ) を再検査するため、エンジン更新時に保存パックが自動的に「要再チェック」になる仕組みは v1 と同じである。

## 32. 識別子の全面改名 (対応表)

v2 ではアンダースコア命名からキャメルケースへ統一された。**旧名は一切使えない**。

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (内部 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`、64B) |

フックの種類 (vertex / surface / light × terrain / liquid の6種) と `pack.json` の形式 (`apiVersion` / `name` / `author`) に変更はない。ローダー制限も不変 (zip 32MB / エントリ 1024 / `.wgsl` 256 個 / 合計 256KB / manifest 64KB)。

## 33. 削除フィールドの移植先

v1 では `time` / `eyePosition` / `sunDirection` / `originOffset` は構造体のフィールドだった。v2 では**これらのフィールドは削除され、代わりにエンジン uniform (`bloxdPackInputs`) を読むヘッダ関数**を使う。関数は uniform を直接読むため、**フックの外のモジュールスコープ関数や vertex フックからでも呼べる**。

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` によるワールド座標化 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 新機能 ①: `blockId` (ブロック固有シェーディング)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` の3構造体すべてに `blockId: u32` が追加された。**面が属するブロックの ID** (0〜65535) で、同じ面の全域で一定 (`@interpolate(flat)` で渡される)。テクスチャの色に依存しないブロック種別の識別に使う。ただし ID とブロック種の対応表はエンジン内部にありパックからは参照できないため、**どの ID が何ブロックかはワールド内で実測する**しかない。

### R-F. blockId によるブロック種別ティント

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 例: 石系 (id の上位ビットパターン) を寒色に傾ける
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. 新機能 ②: `BLOXD_SCENE_DEPTH` と `bloxdOpaqueBehind()` (本命)

v1 で構造的に不可能とされた深度アクセスが、**液体 (liquid) プログラムに限り**解禁された。色は取れないが、**奥の不透明面までの距離と位置という幾何情報が取れる**。典型的な使い方は水の厚みを測った吸収色の計算である。

使用ルール:

| 使い方 | 結果 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 内でガード無しで呼ぶ | OK (液体バリアントでは常に定義) |
| `bloxdTerrainSurface` 内でガード無しで呼ぶ | ERROR。`#ifdef BLOXD_SCENE_DEPTH` で囲む |
| vertex フック内で呼ぶ | ERROR (surface / light フック限定) |

地形フックでも深度を使いたい場合は `#ifdef BLOXD_SCENE_DEPTH` で囲む (地形フックは液体プログラムにも流用されるため、液体側でのみ深度が有効になる)。

### R-E. 水の厚み吸収 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 水の柱の長さ = 現在位置から奥の不透明面まで
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 吸収: 赤は速く落ち、青は遠くまで届く
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 奥が空 = 深い水色へ寄せる
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

応用: 厚みベースの吸収・散乱、`behind.position` からの底面ワールド座標による波紋・コースティック風模様の投影、`found=false` での空と遮蔽の区別による水面の空反射、深度による泡や濁りの段階付与。なお深度コピーのパイプライン構築に失敗した場合は「奥に何も無い」扱いへ安全に劣化する。

## 36. その他の v2 変更点

- **フックのフォールバック**: 液体プログラムは `bloxdLiquidXxx` が未定義のとき地形フックにフォールバックする。**地形フックだけのパックは水面にもそのまま効く**。意図しない場合は liquid 側のフックを明示定義する。
- **`BLOXD_LIGHTING` のフィールドガードは不要に**: 全バリアントで `blockLight` 等が存在し、unlit では既定値 (0 / 1 / 白 / 0) が入る。ライト判定をしたい場合のみ `#ifdef BLOXD_LIGHTING` を使う。既存のガードを残しても動作は変わらない。
- **`BLOXD_ALPHA` の定義条件が変化**: 非 strict の地形バリアントと全液体バリアントで定義され、strict × terrain では定義されない。地形フックで alpha を書く場合はガードを残すこと。
- **構造体の直接構築は禁止**: `BloxdLight(...)` 等のコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` から変更する、または入力のコピーを使う。
- **`let _ =` は `_ =` に**: WGSL の破棄代入 `_ = f();` は有効だが `let _ = f();` は拒否される。
- **offInStrict**: vertex フックの定義、または surface / light フックから到達可能な `discard` があると、エラーではなくパック全体が strict ゲームで自動無効化される (設定 UI に `shaderPack:offInStrict` と表示、allow ゲームでは動作)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む。
- **フォグの拡張**: フォグ計算に LINEAR / EXP / EXP2 の3モードが実装されたが、ゲーム側の設定は従来どおり常に LINEAR のため、既存のフォグ仕様はそのまま使える。`fogColour` の意味も公式に明文化された (完全にフォグの無いシーンでのみ黒)。
- **変わっていないもの**: リフト曲線・35% チャンネル床・heldLight 減衰 (`pow(lightDist, 0.75)`) と環境光ブースト・太陽と月の方向仕様・既定フォグ色・time ラップ (3600 秒)・方向光 (最大 4 個)・Lite (WebGPU) 専用・保存機構 (IndexedDB)・`mod` 予約語。

## 37. v1 → v2 移行チェックリスト

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **識別子**: §32 の対応表で全部置換 (フック名・構造体名・default 関数名)
3. **削除フィールドの移植**: §33 の表に従いヘッダ関数へ (`s.time` → `bloxdTime()` 等)
4. **`fogFactor` → `fogVisibility`** に改名
5. **構造体直接構築を除去**
6. **`let _ =` を `_ =` に**修正
7. **vertex フックと discard は `#ifndef BLOXD_STRICT` で囲む**
8. **水面も地形フックの効果を受ける**ことを確認し、意図しなければ liquid フックを明示定義
9. (任意) `litColour` を起点にフォグを自前管理 / `bloxdOpaqueBehind()` で水の厚み吸収を追加 / `blockId` でブロック固有表現
10. **第2段階 (ブラウザ Tint) も検証する** — 特に `^` `&` `|` `<<` `>>` を含む式の括弧。静的検証を通ってもブラウザで拒否されるコードが存在する (§38)

## 38. 第2検証段階 — ブラウザの WGSL コンパイラは内蔵パーサより厳しい

ゲームのパック検証は **2 段階**ある。第1段階は静的検証 (エンジン内蔵 JS パーサ。フック署名・禁止構文・sceneDepth 利用などパック固有ルールを検査) で、第2段階はブラウザ検証 (コンパイル結果に同梱されるスタブを本物の WebGPU 実装でコンパイルし、エラーをパックの元ファイル行へ逆マッピングして表示する。UI の「Saved, but it won't run until you fix these errors」がこの段階) である。エラー表示末尾の `(only in terrain)` 等の接尾辞は「そのエラーが出たバリアントの program 種」である。

内蔵パーサは WGSL の演算子結合 (Binding) 規則を実装しておらず、**静的検証を通過してもブラウザで拒否される**。被害が出やすいのは整数ハッシュの定番パターンである:

| 演算子 | 帰結 |
|---|---|
| `<<` `>>` | 単項レベルまでしか直接結合できない。`a + b << c` はエラー |
| `&` `^` `\|` | 単項レベルまでしか直接結合できない。`a * b ^ c` はエラー |
| `&&` `\|\|` | 混在不可。`a && b \|\| c` はエラー |

### 括弧の付け方 (NG / OK)

```wgsl
// NG — 静的検証は通過するがブラウザ (Tint) が拒否:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 各乗算を括る (同一演算子の連鎖 A ^ B ^ C 自体は左結合で合法)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

本書の掲載コードはこのパターンを含まない (`pack_hash3` の `+`/`*` 混在と `h ^ (h >> 16u)` は括弧済みのため仕様適合)。パックを書いたら第1段階と第2段階の両方を通すこと。

## 39. 独立した類似資料について

本書とほぼ同じ内容の社区資料として [GlitchHunterCoder/Bloxd-Essay の Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader) が存在する。こちらは本書より先に公開されているが、**本書の内容は glm が Bloxd の本体バンドルファイル (webpack チャンク群) を実際に解析して得た情報であり、コピペなどではない**。両者が一致するのは、同じ実装を独立に調べれば同じ結論に至るためである。

---

調査: ltf_ahel (glm を使用して調査)
