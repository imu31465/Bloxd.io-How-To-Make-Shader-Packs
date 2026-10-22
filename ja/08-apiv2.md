[← 前の部](07-internals.md)・[マニュアルに戻る](README.md)

# 第八部: API Version 2 移行ガイド

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

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

フックの種類 (vertex / surface / light × terrain / liquid の6種) と `pack.json` の形式 (`apiVersion` / `name` / `author`) に変更はない。ローダー制限も変わらない (zip 32MB / エントリ 1024 / `.wgsl` 256 個 / 合計 256KB / manifest 64KB)。

## 33. 削除フィールドの移植先

v1 では `time` / `eyePosition` / `sunDirection` / `originOffset` は構造体のフィールドだった。v2 では**これらのフィールドは削除され、代わりにエンジン uniform (`bloxdPackInputs`) を読み取るヘッダ関数**を使用する。この関数は uniform を直接参照するため、**フック外のモジュールスコープ関数や vertex フックからでも呼び出し可能**。

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` によるワールド座標化 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 新機能 ①: `blockId` (ブロック固有シェーディング)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` の3構造体すべてに `blockId: u32` が追加された。**面が属するブロックの ID** (0〜65535) で、同一面内で一定 (`@interpolate(flat)` で渡される)。テクスチャの色に依存しないブロック種別の識別に利用できる。ただし ID とブロック種の対応表はエンジン内部にありパックからは参照できないため、**どの ID が何のブロックに対応するかは、ワールド内で実測するか、後述の参考データを用いて調査する必要がある**。内部ではこの ID は頂点色の α (下位 8bit) と法線の w (上位 8bit) の合計 16bit に焼かれて運ばれ、上限 65535 はこの経路幅に由来する。blockId システム自体はアクティブなシェーダーパックが存在するときにのみ有効化される (パック無しではワイヤの宛先はパディングのままだが、第二部の構造体定義上この差は観測できない)。

**参考**: 作者がゲーム内エントリ一覧を [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) で公開している (`entries.json`: id ↔ ブロック名の対応表。`Furnace|meta|rot2` のような回転・meta の変種 ID も収録)。ゲームの更新で対応は変わる可能性があるため、最終的な確認は実機で行うこと。

よく使うブロックの例 (entries.json より、2026-10-18 時点。id の低い地形系のみ抜粋):

| ID | ブロック名 | ID | ブロック名 |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json には道具などの非ブロック項目も収録されているが、地形・液体のフックに届くのはブロック系の id である。

### R-F. blockId によるブロック種別ティント

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 例: 石系 (id の上位ビットパターン) を寒色寄りにする
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. blockId の実測 — bit 平面表示パック

対応表に載っていないブロックの id をワールド内で調べるデバッグレシピ。先頭の `plane` を `0, 1, 2, …` と変えながら、調べたいブロックの面の色を読む。

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

面の色は blockId の 3 ビットをそのまま RGB で表す (黒 = 0 / 赤 = 1 / 緑 = 2 / 黄 = 3 / 青 = 4 / マゼンタ = 5 / シアン = 6 / 白 = 7)。1 回の観察で 8 進数 1 桁が読める。p0 → p3 の順に 3, 2, 7, 2 と読めた場合は、上の桁から並べた 8 進 2723 = 1491 が id となる (Lava)。id の低い地形系は p0 と p1 の 2 回で足りる。surface フックのみで構成されているため、strict タイトルでも動作する。

### R-H. 葉だけをそよがせる — blockId による vertex フックの絞り込み

R7 の風レシピ ([第三部](03-recipes.md)) は地形全体を波打たせるが、vertex フックでも `blockId` が読めるため、対象を葉ブロックだけに限定できる。id 一覧と WGSL 用の配列は以下の通り (2026-10-18 時点の実測。Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / 果実変種 / Autumn Aspen の 22 種):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex フックは strict タイトルで自動無効 (§36 参照)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // 変位はワールド位置の滑らかな関数にする。ワールド上の同一地点を指す
        // 共有頂点が同じ値に動くため、面が剥がれない ([第三部](03-recipes.md) R7 も同じ原則)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- id 一覧はエンジンの更新で増える (実測でも新ビルドで 50 種のブロックが追加された)。使い続ける場合は [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) か R-G のビット平面表示で追加分を調べて配列に足すこと
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) は地面に敷く非固体の敷き葉である。揺らすと地面から浮いて見えるため、配列から外して除外するのも一つの選択
- strict タイトルでは vertex フックが丸ごと無効になるが、上のガードがあれば「揺れが止まるだけ」で、フラグメント側の効果は生き続ける

## 35. 新機能 ②: `BLOXD_SCENE_DEPTH` と `bloxdOpaqueBehind()` (本命)

v1 では構造上不可能とされていた深度アクセスが、**液体 (liquid) プログラムに限り**解禁された。色は取得できないが、**奥の不透明面までの距離と位置という幾何情報が取得できる**。典型的な用途は、水の厚みを測定して吸収色を計算することである。

使用ルール:

| 使い方 | 結果 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 内でガードなしで呼び出す | OK (液体バリアントでは常に定義されている) |
| `bloxdTerrainSurface` 内でガードなしで呼び出す | ERROR。`#ifdef BLOXD_SCENE_DEPTH` で囲む必要がある |
| vertex フック内で呼び出す | ERROR (surface / light フックでのみ使用可能) |

地形フックでも深度を使用したい場合は `#ifdef BLOXD_SCENE_DEPTH` で囲む (地形フックは液体プログラムにも流用されるため、液体側でのみ深度が有効になる)。

### R-E. 水の厚み吸収 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 水の柱の長さ = 現在位置から奥の不透明面まで
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 吸収: 赤は速く減衰し、青は遠くまで届く
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 奥が空 = 深い水色へ寄せる
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

応用: 厚みベースの吸収・散乱、`behind.position` からの底面ワールド座標による波紋・コースティック風模様の投影、`found=false` での空と遮蔽の区別による水面の空反射、深度による泡や濁りの段階付与。なお深度コピーのパイプライン構築に失敗した場合は「奥に何も無い」扱いへ安全に劣化する。深度テクスチャはページのレンダラー生成時に「アクティブなパックが深度を読むか」で用意が確定するため、**深度を読むパックを使うときは必ずページ再読み込みを挟む**こと。パックを有効にしたまま再読み込みせずに深度が要求された場合、コンソールに `…reads scene depth on a page that didn't turn it on` と一度だけ警告が出て、深度は 1×1 の代替テクスチャに置き換わるため `bloxdOpaqueBehind()` は常に `found = false` を返す。

## 36. その他の v2 変更点

- **フックのフォールバック**: 液体プログラムは `bloxdLiquidXxx` が未定義の場合、地形フックにフォールバックする。**地形フックのみのパックは水面にもそのまま適用される**。意図しない場合は、liquid 側のフックを明示的に定義すること。
- **`BLOXD_LIGHTING` のフィールドガードは不要に**: すべてのバリアントで `blockLight` 等が存在し、unlit では既定値 (0 / 1 / 白 / 0) が設定される。ライト判定を行う場合にのみ `#ifdef BLOXD_LIGHTING` を使用すること。既存のガードを残しても動作に影響はない。
- **`BLOXD_ALPHA` の定義条件が変化**: 非 strict の地形バリアントおよびすべての液体バリアントで定義され、strict × terrain では定義されない。地形フックで alpha を記述する場合は、ガードを残すこと。
- **構造体の直接構築は禁止**: `BloxdLight(...)` などのコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` を変更するか、入力のコピーを使用すること。
- **`let _ =` は `_ =` に**: WGSL の破棄代入 `_ = f();` は有効であるが、`let _ = f();` は拒否される。
- **offInStrict**: vertex フックの定義、または surface / light フックから到達可能な `discard` が存在する場合、エラーではなく、パック全体が strict ゲームで自動的に無効化される (設定 UI に `shaderPack:offInStrict` と表示され、allow ゲームでは動作する)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲むこと。なお公式の設定 UI メッセージ自体が「strict で動かす残りは `#ifndef BLOXD_STRICT` で囲め」と案内しており、この作法は慣習ではなく公式推奨である。
- **フォグの拡張**: フォグ計算に LINEAR / EXP / EXP2 の3モードが実装されたが、ゲーム側の設定は従来通り常に LINEAR であるため、既存のフォグ仕様はそのまま使用可能。`fogColour` の意味も公式に明文化された (完全にフォグのないシーンでのみ黒となる)。
- **変わっていないもの**: リフト曲線・35% チャンネル床・heldLight 減衰 (`pow(lightDist, 0.75)`) と環境光ブースト・太陽と月の方向仕様・既定フォグ色・time ラップ (3600 秒)・方向光 (最大 4 個)・Lite (WebGPU) 専用・保存機構 (IndexedDB)・`mod` 予約語。

## 37. v1 → v2 移行チェックリスト

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **識別子**: §32 の対応表に従ってすべて置換 (フック名・構造体名・default 関数名)
3. **削除フィールドの移植**: §33 の表に従い、ヘッダ関数へ移行 (`s.time` → `bloxdTime()` など)
4. **`fogFactor` → `fogVisibility`** に改名
5. **構造体直接構築を除去**
6. **`let _ =` を `_ =` に**修正
7. **vertex フックと discard は `#ifndef BLOXD_STRICT` で囲む**
8. **水面も地形フックの効果を受ける**ことを確認し、意図しない場合は liquid フックを明示的に定義すること
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

// OK — 各乗算を括弧で囲む (同一演算子の連鎖 A ^ B ^ C は左結合で合法)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

本書の掲載コードはこのパターンを含まない (`pack_hash3` の `+`/`*` 混在と `h ^ (h >> 16u)` は括弧済みのため仕様適合)。パックを書いたら第1段階と第2段階の両方を通すこと。

## 39. 独立した類似資料について

本書とほぼ同じ内容の社区資料として [GlitchHunterCoder/Bloxd-Essay の Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader) が存在する。こちらは本書より先に公開されているが、**本書の内容は glm が Bloxd の本体バンドルファイル (webpack チャンク群) を実際に解析して得た情報であり、コピペなどではない**。両者が一致するのは、同じ実装を独立に調べれば同じ結論に至るためである。

---

調査: ltf_ahel (glm を用いて調査)

[← 前の部](07-internals.md)・[マニュアルに戻る](README.md)
