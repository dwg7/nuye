# HANDOVER

## Status as of 2026-09-08

Phase 0(調査)〜Phase 4(地形統合、簡易標高断面含む)まで完了・実機確認済み。
`dwg7/nuye`を立ち上げ、GitHub Pagesで公開している。

- 動作確認済みURL: **https://dwg7.unopengis.org/nuye/**
  (`dwg7.github.io/nuye/`はここへ301リダイレクトされる、DECISIONS.md D7)

## 動作確認済みの機能

実際にGitHub Pages上のデプロイ(`https://dwg7.unopengis.org/nuye/`)で、以下すべてを
実機確認した。

- 地図表示(stars positron、初期中心=札幌駅〜月寒中央の中間点、zoom 12.5——
  実測で確認済み、DECISIONS.md D10)
- 点・線・面の描画(terra-draw)。描き終わると自動的に選択状態になり、属性パネルが開く
- 属性編集(名称・カテゴリ・状態・観測者・注記・次の行動・出典)。フィーチャー一覧の
  表示にも反映される
- フィーチャー一覧からのクリック選択(描画ツールボタンのハイライトも追従する、
  DECISIONS.md D9)
- フィーチャーの削除
- ブラウザ内保存(LocalStorage)、保存時刻の表示、ページ再読込後の復元
- ベースマップ切替(positron⇔bvmap-dark)。切替後もフィーチャー・地形設定の両方が
  引き継がれる(`TerraDraw`インスタンス・地形source/layerとも作り直す方式、
  DECISIONS.md D5・D12)
- GeoJSONダウンロード(内部ヘルパーフィーチャー混入なしを確認)
- GeoJSON読込(Point/LineString/Polygonは正しく読み込まれ、未対応形状
  (MultiPoint等)は正直に警告を出して読み込まないことを確認、DECISIONS.md D8)
- 「すべて消去」(LocalStorageが`null`になることまで確認)
- **サンプルミッション読込**: 7件(経路1・確認地点3・次回確認地点1・区域2)すべてが
  正しいカテゴリ・状態ラベルで読み込まれ、地図上にも経路・区域・地点として正しく
  描画されることを確認(DECISIONS.md D11)
- **地形トグル**: ON/OFF切替、attribution表示("Processed with Mapterhorn")での
  ソース接続確認、ベースマップ切替後も地形ON状態が維持されることを確認
  (DECISIONS.md D12)
- **簡易標高断面**: サンプルミッションの経路(6.41km)で標高18〜71mを取得、
  SVGチャートの描画を確認。地形が事前にオフ/オンいずれの状態から呼んでも
  ほぼ同じ実標高値(誇張なし)が返り、呼び出し後に地形のON/OFF状態が正しく
  復元されることの両方を確認(DECISIONS.md D13)
- **空中写真(kitaphoto17)**: [issue #1](https://github.com/dwg7/nuye/issues/1)
  対応。positron・bvmap-dark両方で、基本の土地被覆色の上・道路や注記の下という
  意図した位置に実際に表示されることを確認(DECISIONS.md D14)

## 未確認の機能

- フィーチャーのドラッグ移動・頂点編集(select mode flagsで`draggable`/
  `coordinates.draggable`等は有効にしてあるが、実機でのドラッグ操作そのものは
  まだテストしていない)

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

## 解決済み事項(続き2)

- ~~`mapterhorn-japan-bridge`が404を返す~~ → mapterhorn-japan-bridge担当セッションから、
  D148/D152(elevationアーカイブ再生成)によるdelete-then-transfer中の一時的な
  挙動だったと連絡があり、2026-09-09 03:02:57 JSTに公開完了。こちら側でも
  TileJSON・タイル取得(200、有効なwebp画像)を直接確認し、nuye実機でも
  地形トグル・標高断面(標高17〜71m、障害前の実測値と一致)が正常に動作する
  ことを確認した

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

## 次に行うべき作業

起動プロンプトのPhase 0〜5(調査・最小地図・書き込みの縦切り・サンプルミッション・
地形統合・適用可能性評価)は一通り完了した。MMGIS_REVIEW.mdのPhase 5評価により、
「複数人が同時に同じ地図を更新し合う」という具体的な要件が出ない限り、次段階
(GitHub管理・軽量保存API・MMGIS本体)へ進む必要は無いという結論に至っている
——次の一手は、そうした要件が実際に生まれた時にこの評価を読み直すこと。

優先度をつけるとすれば:

1. フィーチャーのドラッグ移動・頂点編集の実機確認(未確認の機能、上記参照)
2. 一覧選択時に別フィーチャーの編集ハンドルが視覚的に残る件の再現・調査
   (未解決事項、上記参照)
3. 実際の利用者(道路管理・除雪等の現場担当者)に触ってもらい、フィードバックを
   得る——ここまではすべて技術実証としての自己検証であり、実務者による評価は
   まだ行っていない

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
