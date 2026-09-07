# DECISIONS

このリポジトリの意思決定ログ。追記専用、既存エントリは書き換えない
(詳細は[dwg7/cafebabe: patterns/markdown-file-conventions.md](https://github.com/dwg7/cafebabe/blob/main/patterns/markdown-file-conventions.md)参照)。

---

## D1: プロジェクトの立ち上げ——名称・スコープ・技術選定

### 背景

Hidenoriさんから、NASA AMMOSのMMGISを参照実装としつつ、「starsが提供する地図に、観測・
経路・区域・確認状況・次の行動を書き込み、持ち出し、再利用できるようにする」という
中心的な利用価値を実証するための、小さく再現可能な静的Webアプリケーションの立ち上げを
依頼された。MMGISの外観や全機能を再現することは目的としない。

### 決定

- リポジトリ名: `dwg7/nuye`(アイヌ語で「書く・描く・刻む」に由来。文化全体の表象としては
  用いず、「地図に書く」という中心機能を示す名称として節度ある形で採用)
- スタック: Vite + TypeScript + MapLibre GL JS(最新版)。UIフレームワークは使わない
- GitHub Pagesの`/docs`から配信(`npm run build`で`docs/`に出力、`base: '/nuye/'`)
- テスト領域: 札幌駅〜月寒中央(起動プロンプト6章の理由をそのまま採用)

### 検証

`npm ci && npm run build`で`docs/`が生成されることを確認。GitHub Pagesでの実配信確認は
D5参照。

---

## D2: MMGISの調査結果——参照する概念と、参照しない実装

### 調査結果

**確認できたこと**(NASA-AMMOS/MMGISの実リポジトリを直接確認):
- ライセンスはApache 2.0。Node.js ≥22、PostgreSQL 16+が必須——サーバー+DB前提であり、
  静的移植は不可能と確認した
- **Draw ToolはLeaflet.draw(`L.Draw.*`)ベースであり、MapLibreではない**
  (`plugins/core/tools/Draw/DrawTool_Drawing.js`で確認)。MapLibre向けの直接的な
  コード流用はできない
- リアルタイム共同編集はWebSocketベースのインフラの上に構築されている
  (`specs/003-real-time-collaboration-infrastructure/`)
- データモデル(`docs/pages/Database/DrawTool/DrawTool.md`): `user_files`(ファイル単位の
  所有者・公開範囲・テンプレート)、`file_histories`(追記専用の操作履歴——
  add/edit/delete/undo/clip/merge/split)、`user_features`(PostGIS座標+
  GeoJSONプロパティ)という3層構造
- 属性は「テンプレート」というJSON定義でファイルごとにカスタムフォームを生成する方式
  (`docs/pages/Tools/Draw/Draw.md`のExample Tool Tab Variables参照)。slider/number/
  text/textarea/checkbox/dropdown/incrementer/dateの型がある

### 決定

- **Leaflet.drawのコードは一切参照しない**(MapLibre向けではないため)。「ファイル」という
  共同編集単位や、テンプレート駆動の属性フォームという発想は将来の拡張候補として
  MMGIS_REVIEW.mdに記録するに留め、初期MVPでは採用しない
- 属性スキーマは、MMGISのような動的テンプレートではなく**固定スキーマ1本**にした
  (`schema.ts`)。複雑さに見合う需要がまだ確認できていないため
- 追記専用の履歴(file_histories)という考え方は、将来サーバーサイド保存を検討する際の
  参考にする(起動プロンプト23章「C. 軽量保存API」の設計時に見直す価値がある)

---

## D3: stars・mapterhorn-japan-bridgeの実URL確認

### 調査結果

すべて実際にfetchして確認した(推測で固定しない、起動プロンプト0章の指示どおり):

- `https://stars.optgeo.org/style/positron` — 200応答(`hfu/stars`リポジトリの
  `styles/positron.json`が実体)
- `https://stars.optgeo.org/style/bvmap-dark` — 200応答(同`styles/bvmap-dark.json`)
- `https://stars.optgeo.org/mapterhorn-japan-bridge` — 200応答、TileJSON
  (`tilejson: "3.0.0"`、terrarium encoding、tileSize 512、maxzoom 16)。
  `hfu/mapterhorn-japan-bridge`の`style.json`に実際に定義されているsource設定を
  そのまま踏襲した

### 決定

`src/mapSources.ts`にこれらのURLを直接参照として持つ。タイル・スタイルの複製はしない
(起動プロンプト4.2「データは可能な限り参照する」)。地形統合(Phase 4)はまだ実装して
いないが、URLは確認済みなので着手時に迷わない。

---

## D4: 描画ライブラリはterra-drawを採用

### 比較

- `mapbox-gl-draw`(ISC): Mapbox GL JS専用。MapLibreでの利用は非公式
- `birkskyum/maplibre-gl-draw`(ISC): MapLibre向けを謳うが、最終更新2025年3月、★12
  ——実質的に停滞していると判断した
- **`terra-draw`(MIT)**: 直近数日以内に更新、★1095。`terra-draw-maplibre-gl-adapter`
  でMapLibre GL JSを公式サポート。Leaflet/OpenLayers/Google Maps/ArcGIS等、複数の
  地図ライブラリに対応するアダプタ設計

### 決定

terra-drawを採用。`npm install`時点で`terra-draw-maplibre-gl-adapter@1.4.1`が
`maplibre-gl@6.7.0`(nuyeが使う最新版)にそのまま解決されることを確認済み——
互換性の懸念は解消された。

Undo/Redoは`TerraDraw`インスタンス自体が標準で持つ(`draw.undo()`/`draw.redo()`)ため、
起動プロンプト10.2の「望ましい」要件を追加実装なしで満たせている(ただし現時点のUIには
ボタンをまだ配置していない——次の一手参照)。

### 検証

`node_modules`内の型定義(`.d.ts`)を直接確認し、コンストラクタ引数・モード名文字列
(`point`/`linestring`/`polygon`/`select`)・イベント(`change`の`type`が
`"delete"|"create"|"update"|"styling"`であること等)を、公式ドキュメントの記述が
実際のインストール済みバージョンと食い違っていた箇所(アダプタのコンストラクタに
`lib`引数は不要、`getting-started`ガイドは旧バージョン向けの記述だった)も含めて
実装前に裏取りした。

---

## D5: MapLibre GL JS v6 + Viteでのワーカー読み込み——`setWorkerUrl`が必須

### 問題

初期実装で地図が全く表示されず(`map.on('load')`が永遠に発火しない)、
`map.isStyleLoaded()`も`false`のまま止まる現象に遭遇した。デバッグの結果:

- ブラウザの自動操作ツールで、MapLibreのワーカーファイル(`maplibre-gl-worker.mjs`)への
  リクエストが、Vite dev serverでは404、`vite preview`(本番相当の静的配信)でも
  SPAフォールバック(text/html)を返すことを、ネットワークログとfetch()での直接検証で
  突き止めた
- 原因はMapLibre GL JS v6自体の既知の制約だった: 「v6はESモジュールのみで配布されており、
  `import.meta.url`ベースのワーカー解決はバンドラのモジュールグラフ内では信頼できない
  ため、各利用者が`setWorkerUrl()`を明示的に呼ぶ必要がある」
  (`maplibre/maplibre-gl-js`の`docs/guides/v5-to-v6-migration-guide.md`および
  `docs/index.md`のインストール節、Viteタブで確認)

### 決定

```ts
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);
```

`?worker&url`(単なる`?url`ではない)をViteのクエリサフィックスとして使う。単なる
`?url`だとワーカーが依存する`maplibre-gl-shared.mjs`が同梱されず、本番ビルドでワーカーが
最初のimportで失敗する——公式ドキュメントに明記されていた注意点で、`?worker&url`は
Viteのワーカー用パイプラインを通すことで、そのシブリング依存ごと1つの自己完結した
チャンクとして出力させる。

### 検証

この修正を適用する前は、**ローカルのVite dev/preview両方でも、実際にデプロイした
GitHub Pages上でも**地図が表示されなかった。修正後、GitHub Pages上の実デプロイ
(`https://dwg7.unopengis.org/nuye/`、D7参照)で地図・全UIが正常に描画されることを
実機で確認した。ローカルのVite dev/preview環境では、この修正後もなお `map.loaded()`
が`false`のまま安定しない挙動が残ったが(D5訂正参照)、これは環境固有の問題であり
本番デプロイでは再現しなかった。

### 訂正(同日)

修正適用後もローカルのVite dev server / `vite preview`では`map.on('load')`が
安定して発火しない状態が残った(`isStyleLoaded()`はtrueになるがワーカー経由の
タイル解決が不安定)。一方、同じビルド成果物をGitHub Pagesの実URLで開いたところ、
地図・サイドバーの全UIが問題なく描画された。ローカルのVite開発サーバー特有の
ワーカー配信(MIMEタイプ・SPAフォールバック)の癖であり、`setWorkerUrl`の修正自体は
正しく、本番相当の静的ホスティングでは問題にならないと判断した。**今後のnuyeの
動作確認は、ローカルdev serverではなく実際にデプロイしたGitHub Pages上で行う**
——HANDOVER.mdに運用上の注意として記録。

---

## D6: terra-drawの内部フィーチャー(選択ハンドル等)をnuyeのデータから除外する

### 問題

線・面フィーチャーを選択すると、頂点編集ハンドル(`selectionPoint`)や中点ハンドル
(`midPoint`)がterra-drawの内部実装として同じstoreに追加されることを実機テストで
発見した(`draw.getSnapshot()`は、これらのUI用フィーチャーも一緒に返す)。フィルタ
無しで保存・一覧表示・GeoJSON出力を実装していたため、3つの実フィーチャー(点・線・面)
しか作っていないのに一覧に11件表示され、GeoJSON出力にも編集ハンドルの座標が
紛れ込む状態になっていた。

### 決定

`properties.id`の有無で判別する`getDataFeatures(instance)`ヘルパーを1箇所に定義し、
`persist()`(保存)・`renderFeatureList()`(一覧表示)・GeoJSONダウンロード・
ベースマップ切替時のスナップショット引き継ぎ、すべてでこれを経由するようにした。
nuyeが作るフィーチャーは必ず`schema.ts`の`defaultProperties()`で`id`
(`crypto.randomUUID()`)を持つのに対し、terra-draw内部の`selectionPoint`/`midPoint`
フィーチャーには`id`プロパティ自体が存在しないため、確実に判別できる
(個々の内部マーカー名を列挙して除外するより頑健——将来terra-drawが新しい種類の
内部フィーチャーを追加しても壊れない)。

### 検証

実機で点・線・面を1つずつ作成し、`localStorage`に保存された内容を直接確認したところ、
修正前は11件(実3件+内部ヘルパー8件)、修正後は実際に作成した3件のみが保存される
ことを確認した。

---

## D7: 公開URLは`dwg7.github.io`ではなく`dwg7.unopengis.org`だった

### 発見

起動プロンプトは想定公開URLを`https://dwg7.github.io/nuye/`としていたが、GitHub Pages
を有効化した際のAPI応答(`html_url`)が`http://dwg7.unopengis.org/nuye/`を返した。
`dwg7.github.io/nuye/`にアクセスすると301で`dwg7.unopengis.org/nuye/`へリダイレクト
されることをcurlで確認——dwg7組織が既にカスタムドメイン(`dwg7.unopengis.org`)を
設定済みだった。

### 決定

以降、nuyeの公開URLは**`https://dwg7.unopengis.org/nuye/`**として文書に記載する
(README.md等)。`dwg7.github.io/nuye/`も引き続きアクセス可能(自動リダイレクト)
だが、正式なURLとしては前者を使う。

---

## D8: 外部GeoJSONの読込が、エラーも出さず全件無視されていた

### 問題

D5の`setWorkerUrl`修正後、GitHub Pages実デプロイで点・線・面の描画・属性編集・保存・
GeoJSON出力までは正しく動くことを確認できたが、**GeoJSON読込を実機テストしたところ、
何も表示されず、コンソールエラーも一切出なかった**。

`draw.addFeatures()`の戻り値(`StoreValidation[]`)を確認していなかったことが
原因の特定を遅らせた——`addFeatures()`は無効なフィーチャーを黙って除外し、例外は
投げない。実際に戻り値をログ出力して調べたところ、全フィーチャーが「検証失敗」扱いに
なっていた。

原因: terra-drawの各モード(`TerraDrawPointMode`等)は、フィーチャーの
`properties.mode`が自分のモード名(`'point'`等)と一致するものだけを自分のものとして
扱う。これはterra-draw自身がフィーチャーを作成する際に自動的に付与する内部プロパティ
であり、GeoJSONの標準的な属性ではない。外部からGeoJSONファイルを読み込んだ場合、
当然この`mode`プロパティは存在せず、`addFeatures()`の検証で機械的に弾かれていた。

### 決定

`main.ts`に`prepareForTerraDraw(feature)`を追加し、GeoJSONを読み込んだ直後・
`draw.addFeatures()`に渡す直前に、Geometry種別(Point/LineString/Polygon)から
対応する`mode`文字列を機械的に補完するようにした。あわせて、`addFeatures()`の
戻り値を確認し、検証に失敗したフィーチャー数と理由(`reason`)を利用者への警告に
含めるようにした——今後同種の問題が起きても、サイレントな失敗ではなく警告として
気づけるようにするため。

`geojson.ts`側のコメント・警告文言も訂正した。MultiPoint等の未対応形状について
以前は「編集不可扱いでそのまま保持する」と書いていたが、実際にはterra-draw側の
検証で同様に弾かれ、保持されないことが分かったため、「読み込めません」と正直に
伝える文言に直した。

### 検証

修正前: Point 1件を含むGeoJSONを読み込んでも、フィーチャー一覧は0件のまま
(`localStorage`の内容も空)だった。

修正後: 同じテストで、Pointフィーチャーは正しく読み込まれて一覧に表示され、
一緒に含めたMultiPointフィーチャーは「1番目のフィーチャー(MultiPoint)は未対応の
形状のため読み込めません。」という警告で正しく除外されることを、GitHub Pages上の
実デプロイで確認した。
