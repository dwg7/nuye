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
// 中心は両地点の中間点。ズーム12.5は、Web Mercatorのmeters-per-pixel計算で
// 両地点間の直線距離(約6.3km)が画面幅(デスクトップ想定1020px)のうち約
// 300pxに収まることを確認した上で選定——大通・すすきの・豊平川横断部を含む
// 帯状区域全体が周辺文脈込みで見える広さになっている(2026-09-07、実機での
// 目視確認込み)。
export const TEST_AREA = {
  sapporoStation: { lng: 141.3508, lat: 43.0686 },
  tsukisamuChuo: { lng: 141.3939, lat: 43.0217 },
  center: { lng: 141.3724, lat: 43.0452 },
  zoom: 12.5
};
