[← 前の部](01-making.md)・[マニュアルに戻る](README.md)・[次の部 →](03-recipes.md)

# 第二部: API リファレンス

## 10. エンジンヘッダ (パックコードの先頭に自動付与される)

以下はエンジンが自動挿入するコードである (パック側で再宣言できない)。`#ifdef` で囲まれた部分はバリアントにより存在が変わる。

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // time が 0 に戻る周期 (秒)

fn bloxdTime() -> f32;               // 秒。3600 秒で 0 に戻る
fn bloxdOriginOffset() -> vec3i;     // 整数ブロック。noa-local + これ = ワールド座標
fn bloxdEyePosition() -> vec3f;      // カメラ位置 (noa-local)
fn bloxdSunDirection() -> vec3f;     // 太陽方向 (単位ベクトル、地球スカイボックス時のみ非ゼロ)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local → ワールド座標
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // この面が属するワールドブロック座標
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // 面が属するブロックの ID (flat 補間で全域一定)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // 面が属するブロックの ID (flat 補間で全域一定)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // エンジンのライティング結果 (emission・フォグ適用前)
    engineColour: vec3f,       // フォグ適用後 = bloxdApplyFog(litColour, l)。emission は含まない
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (全バリアントに存在。unlit では 0)
    skyLight: f32,             // voxel sky light, tone-mapped (全バリアントに存在。unlit では 1)
    ambientLightColour: vec3f, // 全バリアントに存在 (unlit では白)
    skyLightColour: vec3f,     // 全バリアントに存在 (unlit では白)
    heldLight: vec3f,          // held light here (全バリアントに存在。unlit・圏外では 0)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (v1 の fogFactor から改名)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // 面が属するブロックの ID (flat 補間で全域一定)
}

struct BloxdLight {
    colour: vec3f,
}

// 液体バリアント・surface / light フック限定
struct BloxdOpaqueBehind {
    found: bool,       // 奥に不透明な面が無い (空) のとき false
    position: vec3f,   // 奥の不透明面の位置 (noa-local)
    distance: f32,     // 視点からの距離
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

解釈の要点:

- `bloxdTime()` は3600秒で折り返す経過時間 (`bloxdTimeWrap`)。ゲーム内の昼夜時計と同期しているとは限らず、bind group の stage 可視性が VERTEX|FRAGMENT のため **vertex フックからも呼び出せる**。
- `bloxdSunDirection()` は太陽が存在するときの単位ベクトルで、空に太陽がない場合はゼロ。**月は常に `-bloxdSunDirection()` にある** (エンジンが月の位置を太陽の正反対に計算するため)。現行ビルドでは昼夜サイクルの実装はなく、太陽・月・星はゲーム実行中に移動しない (表示の ON/OFF は `dayNightSunOpacity` 等の不透明度設定のみ)。既定の地球空では太陽はほぼ `(−0.56, 0.81, −0.18)` (高度約 54°) に静止する。**零ベクトルを `normalize` に渡さないこと** — `dot(d, d) < 1e-8` で太陽の不在を検査し、定数方向へフォールバックするのが安全 ([第七部](07-internals.md) §28 参照)
- ※補足: 従来「ゼロ時に月の方向として再利用できない」と書いていたが、方向自体は `-bloxdSunDirection()` で得られる。外部配布するパックは `sunPresent` で分岐する書き方にしておくのが安全 (青い環境光の擬似表現については R2、方向性月光については[第七部](07-internals.md) R-A 参照)
- `emission` は照明計算の後に加算され、**`fogVisibility` で減衰される** (defaultLight の実装は `engineColour + emission × fogVisibility`。完全に霧に沈む遠景では発光も消失する)。
- **フォグ適用順序**: フラグメント内の処理順は ① 照明・発光の合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light フック呼び出し → ⑤ return。したがって **engineColour はフォグ適用済み**で届き、**light フックの返り値がそのまま最終色** (フック後にフォグは再適用されない)。
- **fogVisibility の定義元**: ビュー空間距離 (頂点単位で計算・補間)。linear モードでは `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (0..1 でクランプ)。
- **fogMode == 0 のとき**: `fogColour` には `vec3f(0.0)` (黒) が渡される。fogColour の色味で時間帯を推定するコードは注意が必要。
- **現行ビルドの実フォグ設定**: **linear 固定**。`fogStart = 描画チャンク距離`、`fogEnd = +1 チャンク` (地平線のみ)。フォグオフ設定では 100 / 101 チャンクに設定され実質無効。既定フォグ色は RGB (183, 191, 195)。
- **`skyLight` / `blockLight` / `heldLight` は「リフト曲線」通過後の値**で届く。ヘッダコメントの `tone-mapped` がこれを指す: エンジンはフラグメントで必ず `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を掛けてからパックに渡す。生の voxel 値 (n/15) ではなく、例えば木の下 (生値 0.87) は **0.97 に持ち上げられて届く**。滑らかな階調用途ならそのままで良いが、**しきい値で日向/影を分離したい場合は逆変換 `c=(1-y)^(1/3); x=3(1-c)/(3-2c)` で生値を復元してから使う** (R9.12)。
- `skyLight` の実体は「その場所から空が見えるか」のボクセル遮蔽データ (= 影マップ) であり、単なる明るさパラメータではない (15章「影の真実」)。
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`、64B) は**ヘッダ関数経由でのみ使用する**。パックから直接参照しない。stage 可視性は VERTEX|FRAGMENT のため、ヘッダ関数はフックの外のモジュールスコープ関数や vertex フックからも呼び出せる。深度テクスチャ (binding 1) は FRAGMENT 専用のため、`bloxdOpaqueBehind()` は surface / light フック限定である。
- **`litColour` が起点に使える**: v1 ではフォグ済みの `engineColour` しかなかったため、自前の大気表現で二重フォグになりがちだった。v2 ではフォグ前・emission 前の `litColour` から始め、`bloxdApplyFog()` で自分のペースでフォグを掛け直せる。
- **`blockId` でブロック種別を見分けられる**: テクスチャ色に依存しない識別。ただし ID とブロック種の対応表はエンジン内部のため、どの ID が何ブロックかはワールド内で実測するか、参考データ [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) の一覧で調べる ([第八部](08-apiv2.md)参照)
- **構造体の直接構築は禁止**: `BloxdLight(...)` 等のコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` から変更する、または入力のコピーを使う。

## 11. バリアント一覧

| バリアント | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + 照明off + 地形 | – | – | ✓ |
| allow + 照明off + 液体 | – | – | ✓ |
| allow + 照明on + 地形 | – | ✓ | ✓ |
| allow + 照明on + 液体 | – | ✓ | ✓ |
| strict + 照明off + 地形 | ✓ | – | – |
| strict + 照明off + 液体 | ✓ | – | ✓ |
| strict + 照明on + 地形 | ✓ | ✓ | – |
| strict + 照明on + 液体 | ✓ | ✓ | ✓ |

バリアントごとにヘッダ構造体の形も変わる (strict では `BloxdVertex` 自体が無い、照明off では `blockLight` 等が無い、strict地形では `alpha` が無い)。

定義される記号は公式には 4 種である (上表の 3 種 + `BLOXD_SCENE_DEPTH` — [第八部](08-apiv2.md) §35)。地形 / 液体の違いは記号ではなく**別プログラム**であるため、`#ifdef BLOXD_TERRAIN` のような分岐は書けない。フラグ名の照合は大小文字を区別しない。`#ifdef` に誤った名前を書くと、エラー文言が 4 種の正式一覧を表示する。フック関数が注入されるのも地形・液体の 2 プログラムのみで、パックはエンティティやパーティクル等の他の描画に影響を与えられない。

## 12. 骨格チートシート

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // ← 直接構築は禁止。必ず default から
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain では allow の時だけ alpha がある
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // 照明 on だけの入力はガードする
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex は必ずこのガード付きで
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

常に意識する5点: 8バリアントすべてで通す / strict が大多数 / テクスチャ不可 / フック引数は読み取り専用 / `let` はモジュールスコープに置かない。

[← 前の部](01-making.md)・[マニュアルに戻る](README.md)・[次の部 →](03-recipes.md)
