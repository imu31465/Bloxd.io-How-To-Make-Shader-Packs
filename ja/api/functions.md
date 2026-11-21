# 関数

> 対象API: 5 · 種別: 技術資料

ヘッダーが提供する全関数を掲載します。テクスチャAPI (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) は [テクスチャAPI](texture-api.md) で、特殊関数 `bloxdOpaqueBehind` も含めて個別に詳説します。

## フレーム関数 (フレーム全体で同じ値を返す)

ヘッダー自身の注記: *"These functions return the same value for the entire frame."* uniform `bloxdPackInputs` 経由で読まれるため、vertex フックからもモジュールスコープ関数からも呼べます。

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **戻り値**: カメラのレンダー座標
- **使用可能なフック**: 全9フック + モジュールスコープ関数
- **用途**: 視線ベクトル (`normalize(l.position - bloxdEyePosition())`)、リムライト、距離計算

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **戻り値**: 整数ブロック単位のオフセット。**レンダー座標 + このオフセット = ワールド座標**
- **意味**: プレイヤーの移動とともに変化する。レンダー座標を 0 近傍に保つための仕組み
- **用途**: `bloxdWorldPosition()` が内部で使用

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **戻り値**: 太陽方向の単位ベクトル (ワールド方位)。**太陽がないときはゼロベクトル**
- **重要な事実**:
  - **月は常に `-bloxdSunDirection()` の方向にある** (エンジンが月を太陽の正反対に配置する)
  - **零ベクトルを `normalize` に渡さないこと** — `dot(d, d) < 1e-8` で太陽の不在を検査し、定数方向へフォールバックするのが安全
  - ゲーム内には昼夜サイクルの実装がなく、太陽・月・星はゲーム実行中に移動しない (表示 ON/OFF は不透明度設定のみ)。既定の地球空では太陽はほぼ `(−0.56, 0.81, −0.18)` (高度約 54°) に静止
- **用途**: 色温度、光源方向、日光の当たり判定、月光の擬似表現

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **戻り値**: ページが読み込まれてからの経過秒
- **精度**: f32 のため最初の4.5時間はサブミリ秒精度
- **用途**: アニメーション。周期タイマーは `bloxdSeconds() % period` で作る
- **注意**: v2 の `bloxdTime()` (3600秒で折り返す) とは異なり折り返さない

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **戻り値**: ブロック光と天空光のライティングが有効かどうか
- **v5 の追加**: v4 の `#ifdef BLOXD_LIGHTING` (コンパイル時分岐) を置き換える実行時判定
- **無効時の保証** (ヘッダー注記): `blockLight` と `heldLight` は 0、`skyLight` と光の色 (`ambientLightColour` / `skyLightColour`) は 1
- **用途**: ライティング系コードのゲート:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... ライティングが有効なときの処理
    return out;
}
```

`BLOXD_LIGHTING` を使うと *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* が出ます。

## 座標変換

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **引数**: レンダー座標
- **戻り値**: ワールド座標 (`position + vec3f(bloxdRenderOffset())`)
- **注意**: f32 の精度限界があるため、遠くの座標では誤差が出うる (ヘッダー注記: *"with possible f32 inaccuracy"*)

### `bloxdFragmentBlockPosition`

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

この関数は**ドキュメントされたヘッダーにはもう含まれません** (v4 までは含まれていた) が、エンジンは今も受け入れ、定義も注入し続けています:

- **バリデータ**: 生きたシグネチャ表にまだ載っているため、名前検証は全フック (Vertex フックを含む) で通る
- **ランタイム**: コードジェネレーターは地形/液体モジュールとモデル両プログラムに今も定義を注入する — 地形/液体は `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`、モデルは 1/64 ブロックオフセットで設置済みブロックモデルはセルにスナップする変種
- **注意**: 非公開の内部関数なので、将来のバージョンで予告なく消える可能性がある — 連続値には `bloxdWorldPosition()`、「どのブロックか」には `flags` を使うこと (ヘッダーからの除外の経緯: [バージョン履歴: v5](../history/v5.md))

v4 向けに書いて呼び出しているパックはそのまま動きます。新規コードでは採用しないでください。

## デフォルト関数 (エンジンの既定挙動)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// 実装: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

`colour` を通し、`enchantColour` / `overlayColour` を無変更でパススルーし、`emission` はゼロにします (`BLOXD_ALPHA` バリアントでは `alpha` も通す)。**出力構造体の構築はこの関数経由でのみ行えます。**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// 実装:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

文字通り «エンジンのレシピを適用し、emission 加算の結果にフォグをかける»。

## ライティングレシピ関数

v4 作者が手で再導出し続けてきたエンジン自身のライティングが、呼び出し可能な WGSL として文書化されました。各関数の解説と処理フロー図は [ライティング](lighting.md) を参照。

| 関数 | シグネチャ | 役割 |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | 面の材質と角度がどう光るか (Lambert × diffuse + emissive + ambient、0〜1にクランプ) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | このフラグメントのワールドの光 (block/sky/held の最明値、`ambientLightColour` を下限に) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | エンジンと同じ順序で照らされた面の色 (emission とフォグの前) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | このフラグメントのフォグを色に適用 (`mix(colour, fogColour, fogAlpha)`) |

## シャドウ関数

この3関数は**各パックのコンパイル済みモジュールに注入**され（`bloxdFragmentBlockPosition` と同様）、バリデータの関数表に登録されていますが、可読ヘッダー本文には含まれません。

### bloxdShadow

\u0060\u0060\u0060wgsl
fn bloxdShadow() -> f32
\u0060\u0060\u0060

- **戻り値**: このフラグメントに届く太陽光または月光 — **影の中で 0、照っていれば 1** — *API v5 の追加*
- 何が影を落とすか: **ブロック・プレイヤー・モブ・アイテム** (一人称視点の手持ちアイテムは意図的に除外 — 体が回ると自分が自分に影を落とすため)
- 挙動 (バリデータの説明から逐語):
  - 太陽・月の沈み込みや、面が光から背くにつれて 0 へフェード
  - **\u0060flags.emissive\u0060 の面では 1** (自ら光る面に影はない)
  - 光は \u0060bloxdShadowDirection()\u0060 に沿って進むため、太陽のない空の下でも影は出る
- **呼び出し可能**: surface / light フック
- レシピ: \u0060let sun = mix(shadowColour, litColour, bloxdShadow());\u0060 — [影の表現](../guides/shadows.md) を参照

### bloxdAirShadow

\u0060\u0060\u0060wgsl
fn bloxdAirShadow(t: f32) -> f32
\u0060\u0060\u0060

- **戻り値**: \u0060bloxdShadow()\u0060 と同様だが、**カメラ (t = 0) とこのフラグメント (t = 1) の間の点**で評価 — *API v5 の追加* — 光のシャフト (god ray) 用
- 特徴 (バリデータの説明から逐語):
  - **ブロックのみが落とす** (プレイヤー・モブは落とさない)、**ブロック単位にぼかされる**
  - \u0060t\u0060 は 0〜1 にクランプ
- レシピ: 視線に沿って複数の \u0060t\u0060 をサンプルして累積 — [影の表現](../guides/shadows.md)

### bloxdShadowDirection

概念としてはシャドウ関数と並びますが、可読ヘッダーに存在するため [フレーム関数](#bloxdshadowdirection) を参照してください。


## 特殊関数

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **戻り値**: `BloxdOpaqueBehind` (`hit: bool`、`position: vec3f`、`distance: f32`)
- **使用可能なフック**: Surface / Light のみ (深度テクスチャが FRAGMENT 専用のため)
- **ガード**: `#ifdef BLOXD_SCENE_DEPTH` で囲む (Liquid バリアントでのみ定義)
- **意味**: このフラグメントの奥にある不透明な面 (水越しの地形)。空 (何もない) では `hit == false`
- **v2 からの改名**: `found` → `hit`
- **詳説**: [バージョン履歴: v3](../history/v3.md) の "bloxdOpaqueBehind: 正確な実装" と [エンジン内部と研究](../internals/rendering-pipeline.md)

## 関連

- ライティング関数の使い方と処理順序 → [ライティング](lighting.md)
- テクスチャ関数 → [テクスチャAPI](texture-api.md)
- uniform `bloxdPackInputs` のレイアウト → [パック形式](pack-format.md)
