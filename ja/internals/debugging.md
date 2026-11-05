# デバッグツール

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Analyzed (本番バンドルの JavaScript から直接復元)

URL パラメータ・コンソール・drawcalls 統計など、解析と診断の道具。


- URL パラメータ `?renderer=lite` — Lite (WebGPU) レンダラーを強制 (`webgl2` / `babylon` も可。`babylon` は webgl2 の旧名エイリアス)。優先順位は URL パラメータ > localStorage の `bloxdRenderer` > 設定画面 > 既定 (webgl2)。無効値は警告と共に無視される。URL や localStorage にオーバーライドが残っていると、WebGPU (lite) が必要な場面で失敗し「needs the new WebGPU renderer, so remove the renderer override...」が出ることがある ([読み込みエラー](../troubleshooting/loading.md))
- URL パラメータ `?vconsole` — 画面内コンソール (VConsole) を起動。モバイル実機検証で重宝する
- URL パラメータ `?drawcalls=1` — 描画統計のデバッグパネルが追加される。デバッグ用コンソールからゲームオブジェクトを選ぶか、`drawCalls()`・`why()`・`configureDrawCallWatching()` を使って、パックに限らず大規模ギミックの重複描画 (オーバードロー) や 1 図面あたり約 6.5 万頂点の上限への到達を確認し、性能不足の原因を切り分けられる
- コンソールには `noa-engine v0.33.0` と `Renderer: lite from <ソース>` が表示される — 描画パスの誤診断防止のため、まずこれを確認する
- WebGPU レンダラーはパック適用中「強制 ON」でロックされる。「Disable Block Texture Atlas」設定もロックされ (アトラス ON を維持)、WebGPU 非対応環境ではそもそもパックが適用できない。配布ページに「WebGPU 対応ブラウザが必要」と記載する根拠はここにある
- ブロックテクスチャの実体は 2D 配列テクスチャ (`texture_2d_array`) で、地形のサンプラは nearest かつ repeat に設定されている。さらにメッシャーは材質・AO・ライトが一致する面を 1 つの矩形にまとめる (**greedy meshing**) ため、頂点の UV はマージ面上ではタイル幅を超えうる (縁に 0.0015 のインセット)。繰り返し側はハードの repeat アドレッシングが担うので、マージ面はシームなしに見える。ただし `vUV` を基準に手続き的ディテールを重ねると、マージ面の境界で不連続になり得るため、ワールド位置 (`s.position` + `bloxdRenderOffset()`) を基準に設計するのが安全である
- ゲーム参加ごとにランタイム再検証 (`checkCompilation`) が実行され、実在する全地形マテリアルで実際にコンパイルする (設定画面の静的検証より厳しい)。ここで失敗すると、パックはそのゲームで除外される
