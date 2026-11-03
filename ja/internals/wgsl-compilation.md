# WGSL コンパイルの内部

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブバンドルから復元)

検証の第2段階 — ブラウザの WGSL コンパイラを使った実コンパイル — と、v5 のバリデーションスタブの実装です。

## 2段階検証の必要性

静的検証 (アナライザ) は型チェックが不完全なため、この段階でしか失敗しない記述が存在します (例: `mixing '*' and '^' requires parenthesis` のような WGSL 仕様の演算子優先順位問題)。ゲーム内でのエラーは バリアント名つきで報告されます ([コンパイルエラー](../troubleshooting/compilation.md))。

## バリデーションスタブの生成

静的検証を通したコードに、エンジンは検証用のスタブを合成します (module 29866 から復元):

- 型スタブ表:

| 型 | スタブ値 |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` 等の変換 |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` 等の変換 |

- 構造体は再帰的に構築: `Iq(qC, Cq)` は各フィールドを (ネストした構造体なら再帰的に) スタブ値で埋めたコンストラクタ呼び出し文字列を返す
- 合成されるエントリポイント:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <特殊関数>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <スタブ値>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<スタブ>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<スタブ>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<スタブ>));
    return vec4f(o.colour, 1.0);
}
```

つまり検証は「スタブ入力でフックを実際に呼ぶ WGSL」をブラウザにコンパイルさせることで、構文・型・言語機能の制限違反を炙り出します。

## エラーメッセージの名前復元

エンジンはフック実行用にコードを変形 (スプライス) する際、識別子のマッピング (`originalNames`) を保持します。ブラウザから返ったエラーメッセージ内の識別子をこのマッピングで**元の名前に戻して**表示します — ユーザーは変形後のコードではなく自分が書いた名前でエラー位置を受け取ります。`sourceOf(lineNum)` はスプライス後の行番号を元の (ファイル, 行) に逆写像します。

## ゲーム参加時のランタイム再検証

`checkCompilation` がゲーム参加ごとに実行され、実在する全地形マテリアルで実際にコンパイルします (設定画面の静的検証より厳しい)。ここで失敗するとパックはそのゲームで除外されます。実機チェックには 60 秒の強制タイムアウトがあります ([パフォーマンス](../troubleshooting/performance.md))。

## 関連

- [コンパイルエラー](../troubleshooting/compilation.md) — ユーザー向け対処
- [シェーダー検証の内部](shader-validation.md) — 第1段階 (静的検証)
- [Getting Started: 検証](../getting-started/validation.md) — 検証の流れ
