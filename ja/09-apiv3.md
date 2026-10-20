[← 前の部](08-apiv2.md)・[マニュアルに戻る](README.md)

# 第九部: API Version 3 移行ガイド

対象ビルド: `3ymzdd.main.fae4743f.js` — **2026-10-19 から本番稼働しているビルド**。bloxd.io が本番で配信するバンドルは、この部の当初の調査対象だった preprod デプロイとバイト単位で同一である (メインバンドルとシェーダーパックのチャンクの両方を md5 検証済み)。したがって本稿の内容はそのまま本番に当てはまる。パックモデルは v2 の形を保つ (`pack.json` のフィールド、ローダの制限、uniform レイアウトはいずれも同じ)。

第一部〜第七部は引き続き v2 基準で書かれている。この部では第八部と同じ順序で、v2 → v3 の移行点と v3 の新機能をまとめる。変換はほぼ機械的 (§47) だが、挙動が実際に変わる変更が2つあり — 既定ライトが emission をフォグで減衰させるようになり (§43)、液体バリアントでは `BLOXD_ALPHA` が定義されなくなった (§46) — さらに `blockId` は `blockFlags` に全面置換される (§42)。配布前には必ず実機コンパイルで確認すること。

今回の改訂で追加: **§49–§54** では移行そのものを超え、本番ビルドから復元したエンジン内部仕様を扱う — Lite レンダラがフックを実際にどう呼び出すか、実際の4モードのフォグ関数、`bloxdOpaqueBehind()` の正確な実装、ブロック登録からフックまでの blockFlags の完全な配送経路、実測ヘッダハッシュを含む検証パイプライン。これらは現在までに公開文書化されたパックシステムの最も深い事実であり、他のガイドが未解決としている疑問のいくつかを決着させる。

## 40. v2 パックの運命 (先に結論)

**2026-10-19 追記: v3 は preprod を離れ、現在ライブサイトが配信する版になった。** ロールアウト前に保存されたすべての v2 パック（v2 として配布された全パックを含む）は、本番で以下に述べるとおり失敗する。したがって今日パックを配布する者にとって、§47 の移行はもはや任意ではない。

このビルドは manifest の `apiVersion` が **3 と厳密一致すること**を要求し、**v2/v3 の並行サポートは存在しない**。v2 パックは読み込み時に「API バージョン不一致」のメッセージ（i18n キー、プレースホルダ表記）で拒否される:

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

保存済みパックのライフサイクルは v2 のまま（[第八部](08-apiv2.md) §31）: 各ビルドはエンジンヘッダをハッシュ化し、エンジン更新時に保存パックを自動で「要再チェック」にし、`apiVersion` が現行以外の保存パックはエラーではなく「実行不可」と表示する（上記ステータスメッセージが置換用パックを指す）。

## 41. pack.json と uniform バッファ (変わらないもの)

- 必須 manifest フィールドは不変: `{ apiVersion, name, author }`。
- ローダの制限は不変: 32MB zip / 1024 エントリ / 256 `.wgsl` ファイル / 合計コード 256KB / manifest 64KB。
- エンジンの uniform ブロックは形も不変: `@group(3) @binding(0)`、64 B で、宣言順に time、render offset、sun direction、eye position を格納する。内部フィールド名が2つ変わった: `time` → `seconds`、`originOffset` → `renderOffset`。**バイトレイアウトは v2 と同一**であり、パックコード側に変化はない。パックは uniform を直接名指しできない（エンジンヘッダが engine-provided かつ read-only とし、「which packs can't name」と記す）ため、引き続きヘッダ関数 `bloxdSeconds()` / `bloxdRenderOffset()` を使う。
- パックの group 3 には文書化された2つ目の占有者が加わった: `@group(3) @binding(1)` は `bloxdOpaqueBehind()` が読む scene-depth テクスチャである（完全な実装は §51）。64 B の uniform は binding 0 のままで、パックはどちらの binding も名指しできない。

## 42. blockId から blockFlags へ: ブロック別マテリアルをビットフラグで表す (本命)

3つのフック入力構造体（`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`）すべてで、v2 のフィールド `blockId: u32` は `blockFlags: u32` に**置換**された。エンジン側の説明: *「この面がどの種類のブロックか: `bloxdBlockFlag*` ビット。面内で同一。」* エンジンがマテリアルデータ自体を渡すようになったため、数値 ID の範囲からマテリアルを推測したり、ワールド内に ID 表を維持したりする v2 の方法（[第八部](08-apiv2.md) §34）は不要になった。

ビットは名前付き定数として公開されている:

```wgsl
// テスト: (blockFlags & bloxdBlockFlagRock) != 0
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 値 | 定数 | 意味 (エンジン側の注記を要約) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 完全に不透明 — 葉や氷も含む。ガラス、水、溶岩、スポナー、ゴースト／不可視ブロックは含まない。 |
| 2 | `bloxdBlockFlagEmissive` | ブロック光を放つ。ネオン、ポータル、ランプ、溶岩、ビーコンのように。光る鉱石はどんなに弱くても該当。 |
| 4 | `bloxdBlockFlagVegetation` | 葉と、草ブロックの草 — 草ブロックは dirt でもある。サボテン、キノコブロック、干し草は含まない。 |
| 8 | `bloxdBlockFlagDirt` | 土と土壌。草ブロックを含む。Rocky Dirt は rock でもある。 |
| 16 | `bloxdBlockFlagSand` | 砂、赤砂、すべての砂岩 — 砂岩は rock でもある。 |
| 32 | `bloxdBlockFlagRock` | 石とその種類、安山岩、閃緑岩、花崗岩、砂利、鉱石、砂岩、Rocky Dirt、岩盤、黒曜石、マグマ。 |

複数のマテリアルからなるブロックは該当するフラグを**すべて**持つ（エンジン自身の例: 砂岩は sand かつ rock なので両方）。葉は vegetation だが dirt ではない。草ブロックは vegetation かつ dirt である。

vegetation / dirt / sand / rock フラグは、ブロックの登録**表示名**から割り当てられる（opaque / emissive は代わりにエンジン自身の不透明度・発光データから来る）: `Leaves` で終わる名前、または `Grass Block` は vegetation。`Dirt` / `Soil` を含む名前（およびすべての `Grass Block`）は dirt。完全に `Sand` と `Red Sand`、および `Sandstone` を含む名前は sand。`Stone` / `Andesite` / `Diorite` / `Granite` を含む名前、任意の `Ore`、さらに Yellowstone、Gravel、Bedrock、Obsidian、Magma、Rocky Dirt（および砂岩）は rock。

例 — マテリアル別のブロックティント:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 レシピへの影響: R-H の22要素の葉 ID 配列（[第八部](08-apiv2.md) §34）は `(blockFlags & bloxdBlockFlagVegetation) != 0` に縮約できる。ID ↔ ブロック名の対応表 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) はシェーダ以外の用途では引き続き有用だが、マテリアル表現のためにワールド内で参照する必要はなくなった。

### 草を除いて葉だけを選ぶ (よくある質問)

`vegetation` だけでは葉**と**草ブロックの草の両方に一致する。草ブロックは `dirt` も持つ。dirt を除外すれば葉だけになる — エンジン自身のフィールド説明が示す判別法である:

```wgsl
// 葉のみ: dirt のない vegetation。草ブロックは vegetation かつ dirt。
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 草ブロックのみ (地形サーフェスの草の面):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

ライブレジストリで検証済み（2026-10-20、バンドル `3ymzdd`）: `vegetation && !dirt` は45件の葉登録（22の基本型 — v2 R-H の ID 配列が測ったのと同じ22）に正確に一致し、`vegetation && dirt` は8件の草ブロックに正確に一致する。どちらの方向にも例外はない。面を選ぶには `vertex.normal`（上／下）と組み合わせる。たとえば草ブロックの上面だけ、など。

## 43. 関数名の変更と意味の変更

| v2 | v3 | 備考 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | ページ読み込みからの秒数（下記の f32 精度の注意） |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 同じ量: レンダー位置 + これ = ワールド座標 |
| `const bloxdTimeWrap: f32 = 3600` | **削除** | 周期はパック側で自分で定義する |
| `engineColour` (`BloxdLightIn` 内) | **削除**（14 → 13 フィールド） | `litColour` + フォグから再構築する |
| フック引数 `v` / `s` / `l` | `vertex` / `surface` / `light` | テンプレートの表記。シグネチャは不変 |

- **`bloxdSeconds()`** — ページ読み込みからの秒数。f32 では最初の4.5時間は1 ms未満刻み、9〜18時間では約4 ms刻みで進む。ヘッダは `bloxdSeconds() % period` という書き方を推奨している。0 から `period` まで数えて再び0に戻るため、削除された wrap 定数のきれいな代替になる。
- **`bloxdRenderOffset()`** — ブロック単位: 「レンダー位置 + これ = ワールド座標」。プレイヤーの移動に応じて変わるため、レンダー位置はプレイヤーの近くに保たれ、精度も保たれる。本ガイド全体で、v2 文書が noa ローカルオフセットと呼んでいたものは、今後一貫して**レンダー位置** / レンダーオフセットと呼ぶ。`bloxdOriginOffset()` が返していたのと同じ量である。
- **`bloxdTimeWrap` 削除** — 3600 秒でラップしていたパックは、自分で定数を宣言する。例: `const timeWrap: f32 = 3600.0;` として `% timeWrap`。
- **既定ライトの意味** — v2 の既定は `engineColour + emission × fogVisibility` だった。v3 の既定は `bloxdApplyFog(litColour + emission, light)` として合成する。**既定処理の内部で emission がフォグにより減衰する**ため、合成後の出力がフォグブレンドを一緒に通る。移植表:

  | v2 の式 | v3 の移植先 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2 の式 `l.engineColour + s.emission * l.fogVisibility` の v3 移植:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **名前も意味も不変**: `bloxdEyePosition()`、`bloxdSunDirection()`、`bloxdFaceBlock()`、`bloxdApplyFog()`、`bloxdWorldPosition()`。

## 44. 新しいヘッダ定数: `bloxdPi` と `bloxdTau`

```wgsl
// 半回転と一回転 (ラジアン)。
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

三角関数の小技に便利で、パックが π をハードコードする必要もなくなった。名前の再利用に注意: 同名のパックローカル定数はヘッダの重複識別子チェックに衝突するので、コード内の `bloxdPi` / `bloxdTau` 再宣言を削除するか改名すること。

## 45. 6フックのテンプレート (液体フックが公式に表示される)

ビルドに同梱される既定のパックテキストは、地形／液体 × vertex／surface／light の**6フックすべて**を含み、各フックはエンジン既定値を返す。エンジンのコメントはこう紹介している: *「すべてのフックはエンジン既定値を返す。フックをコピーして出力を変えれば、シェーダーパックを作り始められる。」*

```wgsl
// すべてのフックはエンジン既定値を返す。フックをコピーして
// 出力を変えれば、シェーダーパックを作り始められる。

// strict ゲームでは地形をその場に保つ。ガードがないと、このフックが
// そこでシェーダーパック全体を無効にしてしまう。
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// 水はこれらを使う。削除すると、水は地形フックを使う。
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- フックのコメントは液体の規則を直接述べている: **水には3点セットが必要で、削除すると水は地形フックを再利用する**（v2 で知られていたフォールバック挙動、[第八部](08-apiv2.md) §36。今はテンプレート自体に書かれている）。
- `bloxdLiquidVertex` は `bloxdTerrainVertex` と同じ `#ifndef BLOXD_STRICT` ガードの内側にある — ガードなしでは、地形側の vertex 効果と同様、strict ゲームでパック全体を無効にしてしまう。
- テンプレートの表記は完全なパラメータ名 `vertex` / `surface` / `light` になった（v2 のテンプレートは短い `v` / `s` / `l` だった）。自分のコードのパラメータ名は自由で、重要なのはシグネチャだけである。

## 46. バリアント行列: プログラム軸とマクロの変更

バリアントは **strict × lighting × program** の行列で生成される — v2 と同じ8通りだが、terrain / liquid が明示的な軸になった。バリアント名は `allow|strict · unlit|lit · terrain|liquid` と綴られ、UI では `terrain` / `liquid`、`strict` / `non-strict`、`lighting on` / `lighting off` として表示される（エラー表示には「(only in {{variants}})」が付くことがある）。

| マクロ | 定義される場所 |
|---|---|
| `BLOXD_STRICT` | strict バリアント（両プログラム） |
| `BLOXD_LIGHTING` | lighting オンのバリアント（両プログラム） |
| `BLOXD_ALPHA` | 非 strict の**地形**バリアントのみ |
| `BLOXD_SCENE_DEPTH` | **すべての液体バリアント** |

v2 の規則（[第八部](08-apiv2.md) §36）と比べて、作者向けの変更が2つある:

- **`BLOXD_ALPHA` は液体バリアントで定義されなくなった。** v2 ではすべての液体バリアントでも定義されていた。v3 では液体側の `#ifdef BLOXD_ALPHA` コードが単にコンパイルされない — alpha で制御するロジックは地形フック側に置くか、液体バリアントには alpha を強制するフラグがないことを前提にする必要がある。
- **`BLOXD_SCENE_DEPTH` は液体バリアントで常に定義される。** したがって液体側では深度利用をガードなしで書いてよい（v2 の §35 と同じ）。地形フックでは引き続き `#ifdef BLOXD_SCENE_DEPTH` で囲む必要がある。

## 47. v2 → v3 移行チェックリスト

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** を3つの入力構造体すべてで。マテリアル表現は `bloxdBlockFlag*` 定数に対するビットテストで書く (§42)。v2 の ID 範囲ヒューリスティックは捨てる
3. **`bloxdTime()` → `bloxdSeconds()`**。削除された `bloxdTimeWrap` の代わりに自前の周期を宣言する (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **ライト計算を `engineColour` から `litColour` + フォグへ再構築**する (§43 の表に従う)。既定処理が emission をフォグで減衰させる点に注意
6. **液体フック**: 水を別扱いしたいときは `bloxdLiquid*` を明示的に定義する。省略すると地形フックへフォールバックする
7. **`BLOXD_ALPHA` ガードを監査**する — 液体バリアントからフラグが消えた (§46)。液体側の alpha 制御コードはそこで死ぬ
8. **`bloxdPi` / `bloxdTau` を使う**。三角関数系の定数をハードコードしていた箇所で。ヘッダと重複するパックローカル再宣言を削除する
9. **strict ガードを維持**: vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む。テンプレートは `bloxdLiquidVertex` も地形側と同じようにガードする
10. **実機で検証** — シェーダーパック対応ゲームでコンパイル・テストする

## 48. その他の v3 変更と注意

- **検証は2段階のまま**（[第八部](08-apiv2.md) §38）: まず静的検証、次にブラウザの実際の WebGPU コンパイル。フックを呼ぶ生成スタブスニペットを介して行われ、エラーは元のソースファイル／行にマップされ、診断はマッピングを通じてエンジン側識別子の元の名前を復元する。
- **strict の診断は理由を名指しする**: 地形を動かす vertex フックは「… moves terrain, which strict games prevent.」、surface / light フック内の `discard` は「discard makes terrain see-through, which strict games prevent.」と報告される。設定 UI は引き続き「wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`」(`offInStrict`) の案内を表示する。
- **ローダのメッセージ**: エラーの種類と制限は不変。「Zip64 archives aren't supported.」は UI メッセージ (`loadZip64`) として表示される。
- **ゲーム内エディタ**: シェーダーエディタは CodeMirror ベースに刷新され、WGSL 対応ハイライト、括弧照合、診断範囲表示を備える。
- **ハードウェア要件**: Lite は `shader-f16` WebGPU 機能をサポートするドライバを要求する。古すぎるドライバは「Intel driver too old for Lite (no shader-f16)」のようなメッセージで拒否される。
- **文言**: シェーダーパックを受け入れるゲームについての文は「in games that **support** them」になった。
- **対象タイトルの範囲**: パックが動作するゲームの集合は前ビルドから不変。

## 49. エンジン内部仕様: Lite レンダラがフックを呼び出す方法

§40–§48 はローダとヘッダが教えてくれることである。この節と続く4節は、エンジンが実行時に実際に何をしているかを本番バンドルから復元して文書化する（Lite レンダラ — 175 KB のチャンク。統合元ソースファイルの実名 `lite/terrainShaderPack.ts` がエラー文字列の中に残っている）。ここに書かれたことは、あなたが書くコードを変えるものではない。しかしフックが何を受け取るかについての推測をなくし、他のコミュニティガイドが未解決としている疑問のいくつかを決着させる。

レンダラは JavaScript からフックを「呼び出す」のではない。パックが検証を通ると、エンジンは**シェーダーテキスト内の固定アンカー行を置換することで、あなたのフック呼び出しを自身の地形 WGSL に接ぎ木する**。アンカーはちょうど1回だけ一致しなければならない — 0回または複数回の一致は `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` で中断する。

| 段階 | エンジンシェーダ内のアンカー行 | 接ぎ木される内容 |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` | `BloxdVertexIn` を構築し、vertex フックを呼び、`worldPos` を書き戻す |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` を構築し、surface フックを呼び、`baseColor` / `alpha` を書き戻す |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` の直前 | `let bloxdSpLitColour = color.rgb;` — フォグ前の色を捕捉する |
| light | 同じ位置 | `BloxdLightIn` を構築し、light フックを呼び、`color` を書き戻す |

出荷バンドルから復元した接ぎ木コード（ライトレベルのサンプル式は、エンジン自身の整形が長くなる箇所を省略）:

```wgsl
// vertex 段階 — vertex フックを持つ非 strict バリアント
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* あなたの bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment 段階 — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* あなたの surface フック */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 液体プログラムまたは非 strict バリアントのときだけ接ぎ木される
```

```wgsl
// fragment 段階 — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* ライトレベルの varying */.rgb,        // blockLight
        /* 同じ varying の sky チャンネル */,     // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* 手持ちライト項 (下記) */,              // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — フォグがまったく無いときだけ黒
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* あなたの light フック */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

この接ぎ木から直接導ける強制事項が3つある:

- **strict 地形は surface フックの alpha 変更を無視する。** `alpha = bloxdSpSurface.alpha` の書き戻しは、液体プログラムまたは非 strict バリアントでのみ接ぎ木される — §46 のマクロ表の背後にある実装である。（strict 地形では `#ifdef BLOXD_ALPHA` コードはそもそもコンパイルされないが、ガードなしの alpha 書き込みもそこで破棄されることが確認された。）
- **vertex フックを宣言した strict バリアントは、それを実行しない。** エンジンはビルド時に `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs` と報告する。公式テンプレート (§45) が `bloxdLiquidVertex` を地形側と同じ `#ifndef BLOXD_STRICT` で囲むのはこのためである。
- `bloxdSp*` 識別子（`bloxdSpVertexIn`、`bloxdSpLitColour`、`bloxdSpSceneDepth`、`bloxdSpPixel`、… 合計16個）はエンジン側の一時変数である。あなたのコードからは見えないが、診断や他人のリバースエンジニアリング出力には現れるので、見たらすぐ分かるようになっておく価値がある。

**`BloxdLightIn` に実際に入るもの** — 接ぎ木コードからのフィールド別:

| フィールド | エンジン側の供給元 |
|---|---|
| `litColour` | フォグ混合の直前に捕捉されたフラグメント色（`bloxdSpLitColour` アンカー）— ヘッダの表現では「emission とフォグの前」 |
| `directional` | `vTerrainLambert` — シーンの方向ライトごとの `max(0, dot(normal, lightDirection)) × intensity` を頂点補間した合計（式は §54）。シーンに方向ライトがなければ0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — マテリアルごと、フレームごと |
| `blockLight` | デコードされたライトレベルの varying の `.rgb`（デコードは §54） |
| `skyLight` | 同じライトレベルの varying の sky チャンネル — *「Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING」*（ヘッダ文） |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | ライトレベルの varying の w チャンネルと、フレーム uniform の `uHeldLightPos` / `uHeldLightColour` から作られる手持ちライト項（減衰とチャンネル床の挙動は[第七部](07-internals.md) §26） |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **フォグがまったく無いシーン（モード0、§50）でのみ黒** |
| `fogVisibility` | クランプされたフォグ係数 — §50 の関数が返す正確な値 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying（法線はフラグメントごとに再正規化） |
| `blockFlags` | `vBlockFlags` フラット varying — §52 の完全な配送経路 |

古い資料を読むときの向き付けとして: 同じ接ぎ木アーキテクチャは v2 レンダラにも存在した。v3 の統合差分は `vBlockId` → `vBlockFlags` と液体バリアントの追加だけである。フックシステムは v2 → v3 の断絶をまたいでアーキテクチャ上安定している。

## 50. フォグ関数: 4つのモード、1つのフィールド

本番の地形シェーダから逐語的に復元:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponential
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponential squared
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = フォグ off (係数は 1.0 のまま)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — 1つの vec4 がすべてを駆動する。
- **シェーダには4つのモードが存在する: 0 = off、1 = exponential、2 = exponential-squared、3 = linear。** どのモードが動いても `fogVisibility` はクランプされた係数である — フィールドはちょうど1つで、モードフラグがパックに公開されることはない。
- Bloxd 自身のタイトルはモード3（linear）を駆動し、[第七部](07-internals.md) §25 で述べた32ブロック幅の帯を使う（`fogStart = 32 × D`、`fogEnd = 32 × (D + 1)`）。したがって同部の「常に linear」という観察は、出荷済みゲームプレイについては引き続き正しい。しかし exponential モードは実在する稼働中のエンジンコードである — タイトルはクライアント更新なしに `vFogInfos.x` を切り替えてランプを変えられる。`distance(l.position, bloxdEyePosition())` を自分で計算する距離レシピ（R-B）は、モード切替に影響されないため、距離駆動の見た目を書く堅牢な方法である。
- これにより「エンジンは実際にどのフォグランプを使うのか」という問いがソースから決着する: 4つすべてが実装されており、出荷タイトルは linear を使う。（同じ関数はヘッダの fogColour に関するコメントも説明する — モード0だけが `fogColour` を黒で届けるケースであり、Bloxd のゲームはモード0を出荷しない。代わりにフォグを遠方へ押しやる。[第七部](07-internals.md) §25。）

## 51. bloxdOpaqueBehind(): 正確な実装

関数全体を本番ビルドから逐語的に復元:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **深度テクスチャは `@group(3) @binding(1)` にある** — group 3 はパック自身の group である。binding 0 が 64 B の `bloxdPackInputs` uniform (§41)、binding 1 がこの深度テクスチャだ。どちらもエンジン提供で、あなたの側からは名指しできない。
- `z ≤ 0` は深度サンプルが何にも当たらなかったこと（far plane／空）を意味する: `found = false` で、`position` / `distance` は意味を持たない — 必ず `found` を先に確認する。
- 返される位置は**レイスケールの交点**である: 不透明面を `eye + (fragment − eye) × max(z / viewDepth, 1)` に置く。`distance` は目からその点までの距離 — 水面パックにとっては実質「固いものに当たるまでレイがどれだけ水を通過したか」であり、これが2つ目の深度バッファなしで深度ティント水レシピを成立させている。

## 52. blockFlags の全経路: 登録からフックまで

§42 はビットの意味を説明した。この節は、フラグビットがブロック登録からフックまで旅する完全な経路である — すべてのホップを本番ソースから確認しており、ヘッダの「面内で同一」がバイトレベルまで正しいことも証明する。

**1. 登録（ブロック定義データベース）。** 各ブロックのフラグは登録時に1回計算される:

```js
flags[id] = nameFlags                     // 表示名の規則 (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // opaque ビット — エンジンの不透明度データ
          | (anyFaceEmission >= 1       ? 2 : 0);  // emissive ビット — ブロック光の発光データ
```

表示名の規則が扱うのは4つのマテリアルビットだけである。2つの物理ビットは別のエンジンデータから来る — `opaque` はブロック定義から直接、`emissive` は面ごとのブロック光発光配列から。ヘッダの「光る鉱石はどんなに弱くても該当」は文字通りで、発光が1以上の面があればビットが立つ。

**2. ブロック単位 → マテリアル単位（メッシャー初期化）。** 地形はブロック ID 単位ではなく*マテリアル*単位で描画されるため、フラグはマテリアル表に再集計される（マテリアル ID で索引する `Uint16Array`。各マテリアルは所有ブロックの最初の面のフラグを取る）。この表はメッシュ生成 Web Worker に送られる — ただし**パックパイプラインが有効な構成でのみ**。それ以外では表は `null` で、フラグバイトは一切書き込まれない。パックを使わないプレイヤーは、構造上ゼロのオーバーヘッドしか払わない。

**3. 頂点バイトへ（メッシャーワーカー）。** フラグは既存のインターリーブ頂点データの2バイトの空きに乗る:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 下位 8 ビット → colour 属性の alpha バイト
        buffer[o + normalOffset + 3] = flags >> 8;    // 上位 8 ビット → normal 属性の w バイト
    }
}
```

面の4頂点すべてが同じ値を受け取る — これが「面内で同一」の実装レベルの意味である。

**4. GPU 側のデコード（Lite 地形シェーダ）。** 2バイトは `blockFlagWords: vec2u` 頂点属性（location 7、パックパイプラインが有効なときだけ存在）として運ばれ、vertex 段階で再結合される:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` は `@interpolate(flat)` で宣言されている — 面ごとの定数がフラグメント段階まで続くため、§42 のビットテストは面内で安定し、面の途中でブレンドされることは決してない。

- パイプラインは**16ビット**分の容量を確保している（このデコードは2バイト全体を再結合する）が、v3 が定義するのは6ビットだけである — 将来のフラグは頂点フォーマットの変更も API バンプもなしに追加できる。
- packed-vertex モードでは、同じ2バイトが専用属性ではなく `packed.y` と colour ワードの上位バイトに入る — 値は同じで、容器が違う。
- このフラグについて最もよく聞かれる葉と草の判別については、§42 の[草を除いて葉だけを選ぶ](#草を除いて葉だけを選ぶ-よくある質問)を参照。

## 53. 検証内部仕様: HEADER_VERSION、シグネチャ、予約名

**実測ヘッダハッシュ。** すべてのパック検証はエンジンの `HEADER_VERSION` で刻印される。本番の検証モジュールを直接実行すると（ハーネスの注記は §54 の末尾）、次の値が測れる:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 本番稼働バンドルから実測
```

これは FNV-1a-32 ハッシュ（`6.` 接頭辞）で、5つの入力に対する: バリアントごとに前処理・トークン化されたエンジンヘッダ（8バリアント分のエントリ）、パーサの WGSL 字句宇宙全体、4つのマクロ名、特殊関数マップ、そして `BloxdPackInputs` 宣言とその `@group(3) @binding(0)` uniform 行。作者にとっての帰結は2つ:

- **エンジン側のヘッダ編集はハッシュを変える** — エンジン更新後に保存パックが自動で「要再チェック」になる仕組みの正体である（[第八部](08-apiv2.md) §31）。
- ハッシュが覆うのは*エンジンヘッダ*であり、あなたのコードではない。エンジン更新をまたいで読み込まれ続けるパックは「まだ有効」なのではなく、単にヘッダ変更に引っかかっていないだけである。manifest が関与する唯一のバージョン検査は `apiVersion` ゲートである (§40)。

**フックシグネチャ検査: 型はトークン厳密、名前は自由。** バリデータはフック slot ごとに1つのシグネチャを持つ:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

照合は**トークン単位**: パラメータ型名は厳密一致、`->` と戻り値型も厳密一致、パラメータ数とカンマ位置も検査される。パラメータ*名*は自由 — パラメータ位置の任意の識別子が受け入れられる。だから `fn bloxdTerrainLight(s, l)` は、テンプレートが `(surface, light)` と綴っていてもコンパイルできる。light フックはちょうど2引数を取る。

**予約名。** 規則は単一の正規表現 `/^bloxd/i` である。`bloxd` で始まる識別子はすべて予約 — `bloxd*` はすべてエンジン提供で、パックはその名前空間に宣言を置けない（§44 の `bloxdPi` / `bloxdTau` 再宣言が衝突する理由でもある）。

**特殊関数。** v3 で登録されているのはちょうど1つ:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「special」は*マクロに結び付いた*という意味である — 可用性がバリアントシンボルに依存するエンジン関数。正しい使用を強制するガード診断が2つある:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex フックが surface / light 専用関数に到達した場合。
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — たとえば `#ifdef BLOXD_SCENE_DEPTH` で囲まずに地形側で `bloxdOpaqueBehind()` を呼んだ場合。

**エンジンヘッダ（prelude）の固定。** v3 ヘッダは 5,637 バイトの文字列で、`// Engine-provided and read-only, prepended to all packs. apiVersion 3.` で始まる。エンジン自身の WGSL プリプロセッサがバリアントごとに評価する `#if` / `#ifdef` ディレクティブを含む — エンジンは本当に `#if` 式評価を実行し、不正な式は `Cannot evaluate #if ...` でエラーになる。本ガイドのすべての構造体、関数シグネチャ、引用コメントはこのレンダリング済みテキストに由来するため、ガイドと出荷ヘッダがずれることはない。

**作者向けパーサ注記。**

- パック側の関数はエンジンシェーダに統合されるとき `pack_` 接頭辞で改名される（衝突回避）。診断は元の名前にマップし直す — [第八部](08-apiv2.md) §38 が第2検証段階について説明したのと同じ機構。
- 未宣言識別子のメッセージは `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`。`_ can only be the target of a phony assignment, as in _ = f();` と `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` が、新たに確認されたメッセージ群を補完する。
- パーサの字句宇宙には**標準 WGSL ではない**識別子が含まれる: `bufferView`、`bufferArrayView`、`bufferLength`、`atomicStoreMax`、`atomicStoreMin`。エンジンはこれらを組み込みとして知っているが、特定ブラウザの WGSL 実装が提供する保証はない — 配布パックをこれらに依存させてはならない。

## 54. 確認済みの定数・制限・レイアウト

本番の Lite レンダラから直接得た、地形プログラムの完全なリソースレイアウト:

| Binding | 内容 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f、`view` mat4x4f、`vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`、`uSkyLightColour`、`uAmbientLightColour`、**`vFogInfos`**、`vFogColor`、`outputHeight`、`sceneAmbient`、**`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = レンダーフレームへの平行移動、w = フェードイン可視性 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`、`ambientAndCutoff`、`emissiveAndLevel`、`anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — パック uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — 深度テクスチャ (§51) |

- **方向ライトは最大4灯でハードキャップ**されている。シーンがそれ以上を登録しようとすると、レンダラは `Terrain supports 4 directional lights, not ${n}` でエラーになる。`l.directional` は存在する灯数（0〜4。Bloxd 自身のシーンは2灯 — [第七部](07-internals.md) §27）の Lambert 合計である。
- **地形プログラムの命名**: パイプラインキャッシュキーは `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` と読める — パックは `-sp{variant}` 接尾辞として現れ、§46 のバリアントごとに1プログラムになる。
- **`BLOXD_TERRAIN_DIRECTIONAL` はエンジン内部マクロ**である（dirLightCount > 0 のときに定義）。prelude の4つには含まれず、パックコードには決して届かない — ただしエンジン自身のシェーダの WGSL ダンプには現れるので、知っておくと混乱を避けられる。
- **ライトレベルのデコード**: `aPackedLightLevels` 頂点属性は4つのニブルを詰めた1つの f32 で、各ニブルは15で割られる。rgb = 色付きブロック光、a = sky／held チャンネル。vertex 段階で `vLightLevels` varying にデコードされ、`blockLight` は `.rgb`、sky／held チャンネルは `.w` を読む。エンジンは補間前に rgb チャンネルを最も明るいチャンネルの35%で床打ちする — [第七部](07-internals.md) §26 がゲームプレイから文書化したリフトのエンジン側アンカーである。
- **`vTerrainLambert`**（`directional` の供給元、§49）は、有効な方向ライトに関する合計として生成される: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`。`BLOXD_TERRAIN_DIRECTIONAL` でガードされる。
- **manifest 読み込みの詳細**: `__MACOSX/` 配下の zip エントリ、`._` 接頭辞のファイル、`.DS_Store` は除外される（macOS アーカイブのノイズ）。`pack.json` は小文字化したパス比較で探され、0件なら `loadNoManifest`、2件以上なら `loadDuplicateManifest`。manifest の読み込みは 65,536 バイトで上限される。
- **これらすべての検証方法**: 本番バンドルのモジュールを復元し（165チャンク、4,951モジュール）、Node.js 上の webpack 互換ハーネスで実行した。実測 `HEADER_VERSION` (§53)、レンダリングされた 5,637 バイトのヘッダ、バリアント表の正規順序、特殊関数マップはすべて*出荷コードの実行*から得たもので、文字列を読んだだけではない。同じハーネスはコミュニティ版 `pack_check` v6 の自然な中核になる — エンジン自身のバリデータをパックに対して実行すれば、その判定を正確に再現できる。

---

調査: ltf_ahel (glm を用いて調査)

[← 前の部](08-apiv2.md)・[マニュアルに戻る](README.md)
