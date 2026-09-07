# CLAUDE.md

このプロジェクトを保守する際の運用規約。

## 中心にあるもの

Nuyeの中心的な利用価値は一文で言える:

> starsが提供する地図に、観測したこと、通った経路、対象区域、確認状況及び次の行動を
> 書き込み、持ち出し、再利用できるようにする。

MMGISの外観や全機能を再現することは目的ではない。NASA AMMOSのMMGISは、ミッション
指向の共同マッピングの参照実装として調査対象にする(MMGIS_REVIEW.md参照)が、
Nuyeは「小さく、静的ホスティングだけで動く、書き込みの実用性を実証するもの」であり
続ける。

## 文書運用(dwg7/cafebabeの規約に準拠)

- このCLAUDE.md/README.mdは**現在形**(今何が正しいか)。DECISIONS.mdは**過去形**
  (なぜそうなったか、追記専用のADR)。詳細は
  [dwg7/cafebabe: patterns/markdown-file-conventions.md](https://github.com/dwg7/cafebabe/blob/main/patterns/markdown-file-conventions.md)。
- ドキュメント更新はコードの変更と同じコミットで行う。
- 決定を変えたくなったら、DECISIONS.mdの古いエントリは書き換えず、新しいエントリで
  「D◯参照、その後こう変わった」と追記する。

## DWG7はテクノロジープロバイダーである

背景地図・地形データを含め、外部データはNuyeへ複製しない。starsおよび
mapterhorn-japan-bridgeのURLを直接参照する(`src/mapSources.ts`)。Nuye自身が
データの原典・権威であるかのような設計は避ける(起動プロンプト4章参照)。

## `docs/`はビルド成果物である

人が編集するソースは`src/`。`docs/`は`npm run build`の出力であり、直接編集しない。
`vite.config.ts`で`base: '/nuye/'`・`build.outDir: 'docs'`を設定済み。

## MapLibre GL JS v6 + Viteのワーカー読み込みに関する必須事項

**`src/main.ts`の`setWorkerUrl(...)`呼び出しを絶対に削除しないこと。** MapLibre GL JS
v6はESモジュールのみで配布されており、`import.meta.url`ベースのワーカー解決はVite等の
バンドラのモジュールグラフ内では信頼できない。これが無いと`map.on('load')`が永遠に
発火せず、地図が一切表示されない(DECISIONS.md D5に、実際にこの状態を踏んだ経緯を
記録している)。

```ts
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);
```

`?worker&url`は必須(単なる`?url`ではワーカーの依存ファイルが同梱されない)。

## 動作確認はGitHub Pages上で行う

ローカルのVite dev server / `vite preview`は、ワーカー配信まわりで本番と異なる
不安定な挙動を示すことがある(DECISIONS.md D5訂正参照)。地図・描画機能の動作確認は
`npm run build`してGitHub Pagesへpushした実URL
(`https://dwg7.unopengis.org/nuye/`)で行うこと。ローカルdev serverでの確認が
うまくいかなくても、それだけで実装のバグと判断しない。

## terra-drawのスナップショットにはUI用の内部フィーチャーが混ざる

`draw.getSnapshot()`は、選択中フィーチャーの編集ハンドル(`selectionPoint`)や
中点ハンドル(`midPoint`)といった、terra-draw自身のUIのための内部フィーチャーも
一緒に返す。**保存・一覧表示・GeoJSON出力では、必ず`main.ts`の`getDataFeatures()`を
経由すること**(`instance.getSnapshot()`を直接使わない)。判別は`properties.id`の
有無で行っている——nuyeが作るフィーチャーは`schema.ts`の`defaultProperties()`で
必ず`id`を持つため(DECISIONS.md D6参照)。

## 属性スキーマは固定(動的テンプレートではない)

MMGISのDraw Toolはファイルごとにカスタム属性フォームを定義できる「テンプレート」方式
だが、Nuyeの初期MVPでは`schema.ts`の固定スキーマ1本にしている(id/name/category/
status/observed_at/observer/notes/source/next_action/updated_at)。動的テンプレートの
需要が具体的に確認できるまでは、この単純さを維持する。

## 公開URL

`https://dwg7.unopengis.org/nuye/`(`dwg7.github.io/nuye/`はここへ301リダイレクト
される——dwg7組織のカスタムドメイン、DECISIONS.md D7参照)。
