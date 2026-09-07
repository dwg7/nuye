# Nuye

starsの地図に、観測・経路・区域・次の行動を書き込むための参照型ミッションマップ実験。

**[dwg7.unopengis.org/nuye](https://dwg7.unopengis.org/nuye/)**

## これは何か

> starsが提供する地図に、観測したこと、通った経路、対象区域、確認状況及び次の行動を
> 書き込み、持ち出し、再利用できるようにする。

Nuyeの中心はこの一文に尽きる。地図を眺めるためのアプリではなく、地図を作業面として
使うための実験——地図に点・線・面を描き、それぞれに意味(カテゴリ・状態・観測時刻・
出典・次の行動)を付け、ブラウザ内に保存し、GeoJSONとして持ち出し、また読み込んで
作業を続けられる。

NASA AMMOSのMMGISを、ミッション指向の共同マッピングの参照実装として調査したが、
その外観や全機能を再現することは目指していない(調査結果は
[MMGIS_REVIEW.md](MMGIS_REVIEW.md)参照)。

## 名称の由来

`nuye`は、アイヌ語の「書く、描く、刻む」に由来する名称として採用した。アイヌ文化全体を
表象するものとしては用いていない——このプロジェクトの中心機能である「地図に書く」という
動作を簡潔に示す名称として、節度ある形で選んだ。

## 想定する使い手

道路・歩行環境の現地確認、冬期道路や除雪状況の記録、地震・大雨後の施設確認、行政視察や
共同調査など、「現地で見たこと・通った経路・確認状況・次にやること」を地図に残したい
実務者。

## 使い方

1. 地図上で点・線・面を描く(サイドバー「描く」)
2. 描いたフィーチャーに名称・カテゴリ・状態・注記・次の行動を付ける(選択すると
   下部にパネルが開く)
3. 内容はブラウザ内(LocalStorage)に自動保存される。同一端末・同一ブラウザに限られる
4. GeoJSONとしてダウンロードして持ち出せる。ダウンロードしたGeoJSONは再読込できる
5. 背景地図はstars(`stars.optgeo.org`)ホストのpositron/bvmap-darkを切り替え可能

## データと出典

- 背景地図: stars(`https://stars.optgeo.org/style/positron`、
  `https://stars.optgeo.org/style/bvmap-dark`)を直接参照。Nuye側にタイル・スタイルの
  複製は置かない
- 地形(実装予定): `hfu/mapterhorn-japan-bridge`が公開しているterrain PMTiles
  (`https://stars.optgeo.org/mapterhorn-japan-bridge`)を同様に直接参照する予定
- 描画データ(観測・経路・区域等)はすべて利用者のブラウザ内、またはダウンロードした
  GeoJSONファイルに存在する。サーバーサイド保存はまだ無い

## 開発

```bash
npm ci
npm run dev     # ローカル開発サーバー
npm run build   # docs/ に静的ビルド出力(GitHub Pages配信用)
```

`docs/`はビルド成果物であり、直接編集しない。

### 動作確認について

地図・描画機能の動作確認は、ローカルのdev serverではなく**実際にデプロイした
GitHub Pages上**で行うこと。MapLibre GL JS v6のワーカー読み込みまわりで、ローカルの
Vite dev/preview serverは本番と異なる不安定な挙動を示すことがある(詳細は
[DECISIONS.md](DECISIONS.md) D5参照)。

## 既知の制約

- 保存はブラウザ内(LocalStorage)のみ。複数端末・複数利用者間での同期機能は無い
- 属性スキーマは固定1本(MMGISのようなファイルごとのカスタムテンプレートは無い)
- 対応Geometryは点・線・面。Multi系は読込時に保持するが編集は非対応
- 地形統合・サンプルミッション(札幌駅〜月寒中央)はまだ実装していない

未着手事項・次の一手は[HANDOVER.md](HANDOVER.md)参照。

## Where to look

- 意思決定の経緯 → [DECISIONS.md](DECISIONS.md)
- 開発者向けの運用規約 → [CLAUDE.md](CLAUDE.md)
- 現在の実装状態・未解決事項 → [HANDOVER.md](HANDOVER.md)
- MMGISの適用可能性評価 → [MMGIS_REVIEW.md](MMGIS_REVIEW.md)

## License

コード・文書は[CC0 1.0](LICENSE)(パブリックドメイン相当)。背景地図・地形データ等の
外部データは、それぞれの提供元のライセンス・出典表示に従う(Nuye自身はこれらの原典・
権威ではない)。
