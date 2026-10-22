[← 前の部](05-troubleshooting.md)・[マニュアルに戻る](README.md)・[次の部 →](07-internals.md)

# 第六部: 実装時の重要な補足

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 19. 夜間に「影は暗いのに表面だけ明るい」を直す

影だけを暗くする処理では、太陽の出ていない時間帯でもエンジンの完成色 (`engineColour`) が明るく残り、面と影の差が不自然になる場合がある。影の色調ではなく、完成色全体に対して減衰を適用する必要がある。

次の例では、`bloxdSunDirection()` がゼロの場合は夜間、方向を持つ場合は昼間とみなし、夜間は地形の完成色を減衰させる。照明対応バリアントでは、`blockLight` と `heldLight` の値が強い箇所ほど減衰を緩和し、松明などの近距離光源の効果をできるだけ保持する。`0.52` は調整用の係数であり、より暗くしたい場合はこの値を小さくする。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // 完成色を減衰させ、素材の emission は既定どおりフォグを通して加算する
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**この処理の限界:** `bloxdSunDirection()` の仕様が「太陽あり=単位方向、太陽なし=ゼロ」の二値であるなら、昼と夜の区別はできても、夕焼けや薄明を連続的に推定することはできない。また、完成色を減衰させるため、エンジン側の昼光・環境光をまとめて弱める方式であり、時間帯を完全に再現するものではない。液体にも同じ処理を適用したい場合は、液体フックのフォールバック関係を確認すること。

## 20. 水を自然に見せるための統合レシピ

このAPIではシーン色をサンプリングできないため、**本物の反射・屈折ではなく、フレネル風の色ブレンドと太陽ハイライトによる疑似表現**になる (水深計算は v2 の `bloxdOpaqueBehind()` で可能になり、[第八部](08-apiv2.md) R-E に分離した)。以下は色のベースを残しながら、浅い視線角度で空色に近い色を少し混ぜ、太陽があるときだけ小さなグリントを足すサンプル。

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

調整の目安:

- 水が白っぽい / 明るすぎる場合: `fresnel * 0.38` の `0.38` とグリントの `0.55` を下げる。
- 水が濃すぎる場合: `fakeSkyReflection` の混合率を少し上げる。ただし、上げすぎるとプラスチックのような質感になる。
- 水面に線や規則的な縞が見える場合: 波の周波数やグリント強度を下げる。なお、水面メッシュ自体の頂点変位はこのコードには含まれていない。
- 実際の景色を映したい: このAPIの入力には画面色がないため、色を混ぜるだけでは実反射にならない (深度は液体限定で取得可。[第八部](08-apiv2.md) R-E)。

このレシピは既存の `bloxdLiquidLight` を**置き換える**ものである。R9.7 の同名波法線関数や他の同名フックと重複して適用しないこと。

## 21. 実機テストのチェックリスト

コンパイルの成功と「見た目の良さ」は別であるため、以下の順で確認する。

1. **読み込み:** `pack.json` が ZIP 直下にあること。選択直後は `Ready. Reload the page to use it.` と表示され、**ページ再読み込みで有効化**される。再読み込み後に `Ready to use` になることを確認する。なお一度保存したパックは、エンジン側の仕様ヘッダが更新されるとヘッダ内容の指紋照合により次回ページ読み込み時に自動で再検証される (合格ならそのまま有効 / 不合格なら blocked 表示)。古いパックが壊れたまま黙って有効であり続けることはない。
2. **8バリアント:** strict / allow、照明 on / off、terrain / liquid の各条件において、型ガードの漏れがないことを確認する。ゲームが一部の条件しか使用しない場合でも、配布用パックは8通りすべてを想定する必要がある。
3. **日中:** 草・石・砂・木材など素材ごとに色が不自然に飛んでいないか、上面と側面の明暗差が不自然でないかを確認する。
4. **夜間:** 日向だった場所と同じ素材、影、松明の近くを比較する。明るい面だけが残る場合は露出減衰、全体が暗くなる場合は局所光保護を調整する。
5. **水:** 真上・浅い視線角度・岸辺・水中・夜を別々に見る。アルファの挙動と水中の見え方はゲーム側の合成方法に依存するため、ひとつの視点だけで判断しない。水中は[第七部](07-internals.md)のとおり液体定義色のヴェールが最前面に掛かるため、パック有無の差は主に水面とヴェール越しの地形で確認する。
6. **境界と距離:** チャンク / 原点の切り替わり時に波や模様が途切れないか、遠景で二重フォグや白い霞が発生しないかを確認する。
7. **性能:** ハッシュ・三角関数・`pow` を多用する効果は必要最小限に抑える。ディテールを少しずつ追加し、FPSを比較する。

### 既知の制約を前提にする

- shader pack は terrain / liquid のフックに限定されており、空・エンティティ・UIを同じコードで処理する仕組みではない。
- 影マップ、画面空間反射、屈折、ブルームなどを追加するための入力はこのAPIにない (シーン深度は液体限定で `bloxdOpaqueBehind()` として解禁。[第八部](08-apiv2.md)参照)。
- `bloxdTime()` はアニメーション用の時間であり、ゲーム内の昼夜と連動する保証はない。
- `bloxdSunDirection()` がゼロなら真の月方向ではなく、青い環境光を加える処理は雰囲気を作る近似。方向性のある月光は `-bloxdSunDirection()` で作れる (昼夜サイクルワールド限定。[第七部](07-internals.md) R-A)。
- `s.position` / `l.position` はローカル座標であるため、ワールド位置に依存する効果では `bloxdOriginOffset()` を加える。ブロック内ローカルの模様を作成する場合は、意図的にローカル座標を使用することもある。

## 22. シェーダー単独で限界がある場合の組み合わせ

シェーダーパック側でテクスチャを追加・サンプリングできない制約があるため、素材そのものの細かな凹凸や空の画像を変えたい場合は、シェーダーだけで解決しようとしない。Bloxd.io向けの公開テクスチャーパックリポジトリ [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) には、テクスチャ、skybox、モデル等を扱う別方式の例がある。これはシェーダーパックAPIの公式仕様書ではなく、別システムのリソース例として参照する。

参考までに、コミュニティで「cinematic shader」として出回っている配布物を解析した事例では、中身はテクスチャパック (128x128 テクスチャで `pack.json` / `.wgsl` を含まない) だった。「影付きシェーダー風」の見た目の多くはテクスチャ側の工夫であり、シェーダーパックで光と影を作り分ける (R9.12) 方針と、テクスチャ側の補完を組み合わせるのが現実的である。

現実的には、**シェーダーで光と色を調整し、対応する別のリソースパックで素材や空を補う**方針が望ましい。ただし、別パックとの同時利用の可否や読み込み順については、ゲーム側の実装や設定で確認する必要がある。

テクスチャパック側にも仕様がある (参考): サイズ上限は base64 変換後の JSON 文字列長で 25MB であり、PNG の base64 化は +33% 膨張するため、生画像の合計は ~18-19MB が実質上限になる。CSS は正規表現による簡易解析で処理されるため、ネストやコメントは書かないこと。

## 23. 水中とシェーダーパックの実情

水中の見た目は次の 3 層で構成される。

| 層 | 内容 | パックで操作可? |
|---|---|---|
| ① 地形・液体の描画 | フックで加工できる。light フックは水中でも通常どおり呼び出される | 可 (ヴェールの下で有効) |
| ② 液体定義色のヴェール | カメラ位置の液体ブロック定義 color/alpha の emissive フルスクリーン quad (最前面)。ゲーム設定 `cameraTint` があればそちらが優先される | 不可 (色も濃さも変更不可) |
| ③ cameraTint | ゲーム設定によるもの | 不可 |

実用上の要点: 水中でもパックは動作している / ヴェールは無効化できない / 水中かどうかを条件分岐できない (fogStart / fogEnd / fogColour は水中で変化せず、fogVisibility から推定する方法もない)。

[← 前の部](05-troubleshooting.md)・[マニュアルに戻る](README.md)・[次の部 →](07-internals.md)
