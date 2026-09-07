// GeoJSONの持出し・再読込(起動プロンプト11.2, 11.3)。

export function downloadGeoJSON(features: GeoJSON.Feature[], workName?: string): void {
  const collection = { type: 'FeatureCollection' as const, features };
  const json = JSON.stringify(collection, null, 2);
  const blob = new Blob([json], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = workName?.trim() ? `-${slugify(workName)}` : '';
  const a = document.createElement('a');
  a.href = url;
  a.download = `nuye${name}-${stamp}.geojson`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-぀-ヿ一-鿿]/g, '');
}

export interface ParsedImport {
  features: GeoJSON.Feature[];
  warnings: string[];
}

const SUPPORTED_GEOMETRIES = new Set(['Point', 'LineString', 'Polygon']);

/**
 * FeatureCollection・単一Featureのいずれも受け付ける(起動プロンプト11.3)。
 * MultiPoint/MultiLineString/MultiPolygonは読込は保持するが、初期MVPでは
 * 対応外形状として警告し、そのまま(編集不可扱いで)保持する。
 */
export function parseGeoJSONFile(text: string): ParsedImport {
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('不正なJSONです。');
  }

  let rawFeatures: unknown[];
  if (isRecord(data) && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    rawFeatures = data.features;
  } else if (isRecord(data) && data.type === 'Feature') {
    rawFeatures = [data];
  } else {
    throw new Error('FeatureCollectionまたはFeatureではありません。');
  }

  const features: GeoJSON.Feature[] = [];
  for (const [i, f] of rawFeatures.entries()) {
    if (!isRecord(f) || f.type !== 'Feature' || !isRecord(f.geometry)) {
      warnings.push(`${i}番目の要素はFeatureとして不正なため無視しました。`);
      continue;
    }
    const geomType = f.geometry.type;
    if (typeof geomType !== 'string' || !isKnownGeometryType(geomType)) {
      warnings.push(`${i}番目のフィーチャーのGeometry種別「${String(geomType)}」は未対応です。`);
      continue;
    }
    if (!SUPPORTED_GEOMETRIES.has(geomType)) {
      warnings.push(
        `${i}番目のフィーチャー(${geomType})は編集非対応の形状として、そのまま保持しました。`
      );
    }
    features.push(f as unknown as GeoJSON.Feature);
  }

  return { features, warnings };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

const KNOWN_GEOMETRY_TYPES = new Set([
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'GeometryCollection'
]);

function isKnownGeometryType(t: string): boolean {
  return KNOWN_GEOMETRY_TYPES.has(t);
}
