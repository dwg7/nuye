// 簡易標高断面: 選択中のLineStringに沿って一定間隔でサンプリングし、
// map.queryTerrainElevation()で標高を取得する。地形統合(mapterhorn-japan-bridge)の
// 次段階として位置づけている——起動プロンプトの「優先度の高い追加機能」の1つ。

import type * as maplibregl from 'maplibre-gl';

export interface ElevationSample {
  distanceM: number;
  elevationM: number | null;
}

const EARTH_RADIUS_M = 6371008.8;

function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** LineStringの座標列を、累積距離に沿って等間隔にnumSamples点へ再標本化する。 */
export function resampleLine(coords: [number, number][], numSamples: number): [number, number][] {
  if (coords.length < 2 || numSamples < 2) return coords;
  const cumulative = [0];
  for (let i = 1; i < coords.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineDistance(coords[i - 1], coords[i]));
  }
  const total = cumulative[cumulative.length - 1];
  const samples: [number, number][] = [];
  for (let i = 0; i < numSamples; i += 1) {
    const target = (total * i) / (numSamples - 1);
    let seg = cumulative.findIndex((c) => c >= target);
    if (seg <= 0) seg = 1;
    const segStart = cumulative[seg - 1];
    const segEnd = cumulative[seg];
    const t = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
    const p0 = coords[seg - 1];
    const p1 = coords[seg];
    samples.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
  }
  return samples;
}

const IDLE_WAIT_TIMEOUT_MS = 15000;

/**
 * 標高断面を取得する。queryTerrainElevation()は地形が有効な間だけ実値を返す
 * (無効時は常にnull、確認済み——MapLibreの型定義コメント参照)ため、呼び出し中だけ
 * 誇張なし(exaggeration: 1)で地形を有効化し、呼び出し前の状態(オン/オフ・誇張値)へ
 * 復元する。地形が元々オフだった場合は、DEMタイルの読込を待ってから
 * (`map.once('idle')`)問い合わせる——読込前に問い合わせると全点nullになるため。
 *
 * `idle`にはタイムアウトを設けている——地形ソースが恒久的に失敗する状況
 * (例: 2026-09-08に実際に発生した`mapterhorn-japan-bridge`の404)では、
 * タイルの読込キューが空にならず`idle`が永久に発火しない可能性があり、
 * それを待ち続けると呼び出し元(UI)が無限に固まってしまう
 * (2026-09-08、コードレビューで発見)。
 */
export async function computeElevationProfile(
  map: maplibregl.Map,
  coords: [number, number][],
  terrainSourceId: string,
  numSamples = 20
): Promise<ElevationSample[]> {
  const samples = resampleLine(coords, numSamples);
  const previousTerrain = map.getTerrain();
  const wasEnabled = previousTerrain !== null;

  map.setTerrain({ source: terrainSourceId, exaggeration: 1 });
  if (!wasEnabled) {
    await Promise.race([
      new Promise<void>((resolve) => map.once('idle', () => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, IDLE_WAIT_TIMEOUT_MS))
    ]);
  }

  const cumulative = [0];
  for (let i = 1; i < samples.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineDistance(samples[i - 1], samples[i]));
  }
  const result: ElevationSample[] = samples.map((c, i) => ({
    distanceM: cumulative[i],
    elevationM: map.queryTerrainElevation(c)
  }));

  map.setTerrain(previousTerrain);
  return result;
}
