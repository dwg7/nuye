# HANDOVER

## Status as of 2026-09-07

Phase 0(調査)〜Phase 2(書き込みの縦切り)相当が完了。`dwg7/nuye`を立ち上げ、
GitHub Pagesで公開している。

- 動作確認済みURL: **https://dwg7.unopengis.org/nuye/**
  (`dwg7.github.io/nuye/`はここへ301リダイレクトされる、DECISIONS.md D7)

## 動作確認済みの機能

実際にGitHub Pages上のデプロイで、点・線・面の作成→属性編集→ブラウザ保存→
ベースマップ切替→(未確認: GeoJSON出力→再読込)の一連を目視確認した。

- 地図表示(stars positron、初期中心=札幌駅〜月寒中央の中間点、zoom 12.5)
- 点・線・面の描画(terra-draw)。描き終わると自動的に選択状態になり、属性パネルが開く
- 属性編集(名称・カテゴリ・状態・観測者・注記・次の行動・出典)。フィーチャー一覧の
  表示にも反映される
- フィーチャーの削除
- ブラウザ内保存(LocalStorage)、保存時刻の表示
- ベースマップ切替(positron⇔bvmap-dark)。切替後もフィーチャーが引き継がれる
  (`TerraDraw`インスタンスをスナップショット付きで作り直す方式、DECISIONS.md D5の
  コメント参照)

## 未確認の機能(実装はしたが実機での動作確認が済んでいない)

- GeoJSONダウンロード・再読込(コードは実装済み、実機クリックでの確認は未実施)
- 「すべて消去」ボタン
- フィーチャー一覧からのクリック選択

## 利用中の外部URL(すべて実際にfetchして確認済み、DECISIONS.md D3参照)

```
https://stars.optgeo.org/style/positron
https://stars.optgeo.org/style/bvmap-dark
https://stars.optgeo.org/mapterhorn-japan-bridge   (地形、まだ未統合)
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

## 未解決事項(推測で埋めていない)

1. **ローカルのVite dev server / `vite preview`で、`map.on('load')`が安定して
   発火しない。** `setWorkerUrl`修正後、GitHub Pages実デプロイでは問題なく動作する
   ことを確認したが、ローカル環境固有の原因(Vite dev serverのワーカー配信の癖と
   推測しているが未確定)は特定しきれていない。今後の動作確認はGitHub Pages上で
   行う運用にした(CLAUDE.md参照)が、開発体験としては改善の余地がある
2. GlobeControlの`.maplibregl-ctrl-globe-enabled`⇔`.maplibregl-ctrl-globe`の
   トグル自体は未検証(このプロジェクトではGlobeControlを追加していないため
   該当なし——say-your-gridの知見と混同しないこと)
3. GeoJSON出力・再読込・全消去ボタンの実機クリック確認が未実施(上記参照)
4. テスト領域(札幌駅〜月寒中央)の正確な中心・ズームは、両地点の中間点からの
   暫定算出値(`mapSources.ts`のコメント参照)。実際に地図上で見て微調整すべきという
   起動プロンプトの指示に、まだ従い切れていない

## 壊れやすい箇所

- **`setWorkerUrl(...)`を削除・変更すると地図が全く表示されなくなる**
  (CLAUDE.md・DECISIONS.md D5参照)
- **`instance.getSnapshot()`を`getDataFeatures()`を経由せず直接使うと、terra-draw内部の
  編集ハンドル(selectionPoint/midPoint)がデータに混入する**(DECISIONS.md D6参照)
- ベースマップ切替は`TerraDraw`インスタンスを毎回作り直す設計。`map.setStyle()`が
  terra-drawの管理するsource/layerも巻き込んで消すため(say-your-gridのグリッド枠と
  同種の問題)

## 次に行うべき作業(優先度順)

1. GeoJSON出力・再読込・全消去の実機確認を完了させる
2. サンプルミッション(札幌駅〜月寒中央の模擬調査経路・観測地点・区域)を追加する
   (Phase 3)
3. 地形統合(`mapterhorn-japan-bridge`、Phase 4)——URLは確認済みなので着手障壁は無い

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
