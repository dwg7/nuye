# HANDOVER

## Status as of 2026-09-07

Phase 0(調査)〜Phase 4(地形統合)相当まで完了。`dwg7/nuye`を立ち上げ、
GitHub Pagesで公開している。サンプルミッション(Phase 3)・地形統合(Phase 4)は
コード上は実装済みだが、下記「未確認の機能」に実機確認待ちのものを記載している。

- 動作確認済みURL: **https://dwg7.unopengis.org/nuye/**
  (`dwg7.github.io/nuye/`はここへ301リダイレクトされる、DECISIONS.md D7)

## 動作確認済みの機能

実際にGitHub Pages上のデプロイ(`https://dwg7.unopengis.org/nuye/`)で、以下すべてを
実機確認した(点・線・面の作成→属性編集→一覧クリック選択→GeoJSON出力→GeoJSON
読込→すべて消去→ブラウザ保存の再読込→ベースマップ切替、を一通り)。

- 地図表示(stars positron、初期中心=札幌駅〜月寒中央の中間点、zoom 12.5)
- 点・線・面の描画(terra-draw)。描き終わると自動的に選択状態になり、属性パネルが開く
- 属性編集(名称・カテゴリ・状態・観測者・注記・次の行動・出典)。フィーチャー一覧の
  表示にも反映される
- フィーチャー一覧からのクリック選択
- フィーチャーの削除
- ブラウザ内保存(LocalStorage)、保存時刻の表示、ページ再読込後の復元
- ベースマップ切替(positron⇔bvmap-dark)。切替後もフィーチャーが引き継がれる
  (`TerraDraw`インスタンスをスナップショット付きで作り直す方式、DECISIONS.md D5の
  コメント参照)
- GeoJSONダウンロード(3件描いて出力→内部ヘルパーフィーチャー混入なしを確認)
- GeoJSON読込(Point/LineString/Polygonは正しく読み込まれ、未対応形状
  (MultiPoint等)は正直に警告を出して読み込まないことを確認、DECISIONS.md D8)
- 「すべて消去」(LocalStorageが`null`になることまで確認)

## 未確認の機能

- フィーチャーのドラッグ移動・頂点編集(select mode flagsで`draggable`/
  `coordinates.draggable`等は有効にしてあるが、実機でのドラッグ操作そのものは
  まだテストしていない)
- サンプルミッション読込ボタン(実装は既存のGeoJSON読込パイプラインの再利用なので
  動く可能性は高いが、実機クリックでの確認はまだ)
- 地形トグル(hillshade表示・3D地形・ベースマップ切替後の再適用)の実機確認

## 利用中の外部URL(すべて実際にfetchして確認済み、DECISIONS.md D3参照)

```
https://stars.optgeo.org/style/positron
https://stars.optgeo.org/style/bvmap-dark
https://stars.optgeo.org/mapterhorn-japan-bridge   (地形、DECISIONS.md D12で統合)
```

## 描画ライブラリ

`terra-draw`(MIT) + `terra-draw-maplibre-gl-adapter`。選定理由はDECISIONS.md D4。

## 保存方式

LocalStorage(`nuye:features:v1`)。`src/storage.ts`。同一端末・同一ブラウザに限定。

## GeoJSONスキーマ

`src/schema.ts`の`NuyeProperties`:

```
id, name, category, status, observed_at, observer, notes, source, next_action, updated_at
```

category: observation/route/area/hazard/facility/photo/instruction/next_action/other
status: planned/unconfirmed/in_progress/confirmed/needs_review/completed

## 解決済み事項

- ~~ローカルのVite dev server / `vite preview`で`map.on('load')`が安定しない~~
  → 原因を切り分けて解決した。**`npm run dev`は実際に壊れている**
  (HMRクライアント注入とワーカーの相性問題)。`vite preview`・GitHub Pages実配信は
  正しく動作するが、初回描画に数十秒かかることがあるだけだった(DECISIONS.md D5訂正・
  CLAUDE.md参照)。今後のローカル確認は`npm run build && npx vite preview`を使う

## 解決済み事項(続き)

- ~~テスト領域の中心・ズームが暫定値のまま~~ → Web Mercatorのmeters-per-pixel計算と
  実機目視で確認し、確定値とした(DECISIONS.md D10)
- ~~描画ツールボタンのハイライトが実際のモードとずれることがある~~ →
  `syncToolButtons()`で修正(DECISIONS.md D9)

## 未解決事項(推測で埋めていない)

1. 一覧からフィーチャーを選択した直後、直前に選択していた別フィーチャー(面)の
   編集ハンドルが視覚的に残って見えることがあった(1回だけ実機で観測、再現手順は
   未確定)。データ自体(属性パネルの内容)は正しく切り替わっていたので実害は
   無いと見ているが、再現すれば見た目の問題として調べる価値がある

## 壊れやすい箇所

- **`setWorkerUrl(...)`を削除・変更すると地図が全く表示されなくなる**
  (CLAUDE.md・DECISIONS.md D5参照)
- **`instance.getSnapshot()`を`getDataFeatures()`を経由せず直接使うと、terra-draw内部の
  編集ハンドル(selectionPoint/midPoint)がデータに混入する**(DECISIONS.md D6参照)
- **外部GeoJSONを`draw.addFeatures()`に渡す前に`prepareForTerraDraw()`を経由しないと、
  `properties.mode`が無いために全フィーチャーがサイレントに拒否される**
  (DECISIONS.md D8参照)
- ベースマップ切替は`TerraDraw`インスタンスを毎回作り直す設計。`map.setStyle()`が
  terra-drawの管理するsource/layerも巻き込んで消すため(say-your-gridのグリッド枠と
  同種の問題)。**地形のsource/layerも同じ理由で毎回消えるため、`setupTerrain()`を
  同じタイミングで呼び直している**(DECISIONS.md D12)

## 次に行うべき作業(優先度順)

1. サンプルミッション読込・地形トグルの実機確認を完了させる
2. 簡易標高断面(起動プロンプトの「優先度の高い追加機能」、地形統合の次段階)
3. Phase 5: MMGIS機能との対応整理・静的MVPで足りる用途の整理(MMGIS_REVIEW.mdの
   さらなる充実)

## Where to look

- 意思決定の経緯 → [DECISIONS.md](DECISIONS.md)
- 開発者向けの運用規約(setWorkerUrl必須・getDataFeatures必須等) → [CLAUDE.md](CLAUDE.md)
- 何ができるか・使い方 → [README.md](README.md)
- MMGISの適用可能性評価 → [MMGIS_REVIEW.md](MMGIS_REVIEW.md)

## Resume prompt

次にこのリポジトリを触るときは、まずこのHANDOVER.mdと直近のDECISIONS.mdエントリを
読んで経緯を把握すること。特にD5(setWorkerUrl必須)とD6(getDataFeatures必須)は
知らずに触ると簡単に壊れる。動作確認は必ずGitHub Pages上の実URLで行う
(ローカルdev serverの不調だけで実装を疑わない)。
