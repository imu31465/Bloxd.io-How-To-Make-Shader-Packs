# 最短手順

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified

5分で最初のパックを動かします。

## 1. ファイルを置く

フォルダを作り、`pack.json` と `pack.wgsl` の2ファイルを置きます:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — ほんのり暖色にする最小パック:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> エンジンヘッダー (定数・構造体・関数の宣言一式) は読み込み時にパックの先頭へ自動付与されるため、自分で書く必要はありません。ヘッダー全文は [Engine Internals](../internals/engine-header.md) で確認できます。

## 2. ゲームに読み込ませる

1. ゲームの設定 → Shader Pack から zip またはフォルダを読み込む (フォルダ読み込みはデスクトップ版ブラウザのみ)
2. ステータスを確認する。選択直後は「Ready. Reload the page to use it.」と表示され、**ページ再読み込み後**に「Ready to use」になれば成功
3. 「Saved, but it won't run until you fix these errors...」の場合は、エラー一覧 (ファイル:行 + バリアント) を修正して再読み込みする

## 3. 動作確認する

1. まず制限の緩いゲームで確認する
2. 次に strict モードのゲーム (大多数はこちら) で確認する
3. 頂点移動を使用する場合は、allow 指定のあるゲームでのみ動作する

## 4. 完成したら配布する

zip に固めて配布します。詳細は [配布](distribution.md) を参照。

## つまずいたら

- エラーの意味と直し方 → [Troubleshooting](../troubleshooting/)
- フックの書き方 → [シェーダーフック](hooks.md)
- 最初から全部の9フックを含むテンプレート → 次の [シェーダーフック](hooks.md) に全文があります
