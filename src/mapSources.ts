// stars(stars.optgeo.org)およびmapterhorn-japan-bridgeを直接参照する。
// URLは実際にfetchして200応答を確認済み(2026-09-07、DECISIONS.md D3参照)。
// nuye側にタイル・スタイルの複製は置かない——「データは可能な限り参照する」(起動プロンプト4.2)。

export const BASEMAP_STYLES = {
  positron: 'https://stars.optgeo.org/style/positron',
  'bvmap-dark': 'https://stars.optgeo.org/style/bvmap-dark'
} as const;

export type BasemapId = keyof typeof BASEMAP_STYLES;

export const DEFAULT_BASEMAP: BasemapId = 'positron';

// hfu/mapterhorn-japan-bridgeのstyle.jsonに実際に定義されているsource設定をそのまま踏襲。
export const TERRAIN_SOURCE = {
  id: 'mapterhorn',
  url: 'https://stars.optgeo.org/mapterhorn-japan-bridge',
  encoding: 'terrarium' as const,
  tileSize: 512
};

// テスト領域: 札幌駅 〜 月寒中央(起動プロンプト6章)。
// 正確な中心・ズームは実装時に地図上で目視確認して決める前提だったため、
// 両地点の中間点から暫定値を算出した——実機確認は未実施(HANDOVER.md未解決事項参照)。
export const TEST_AREA = {
  sapporoStation: { lng: 141.3508, lat: 43.0686 },
  tsukisamuChuo: { lng: 141.3939, lat: 43.0217 },
  center: { lng: 141.3724, lat: 43.0452 },
  zoom: 12.5
};
