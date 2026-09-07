// ブラウザ内保存(LocalStorage)。同一端末・同一ブラウザに限定される(起動プロンプト11.1)。
// IndexedDBではなくLocalStorageを選んだ理由はDECISIONS.md参照——初期MVPのデータ量では
// 複雑さに見合わないと判断した。

const STORAGE_KEY = 'nuye:features:v1';
const SAVED_AT_KEY = 'nuye:savedAt:v1';

export interface StoredCollection {
  type: 'FeatureCollection';
  features: GeoJSON.Feature[];
}

export function loadFeatures(): GeoJSON.Feature[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredCollection;
    if (parsed?.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) return [];
    return parsed.features;
  } catch {
    return [];
  }
}

export function saveFeatures(features: GeoJSON.Feature[]): void {
  const collection: StoredCollection = { type: 'FeatureCollection', features };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  localStorage.setItem(SAVED_AT_KEY, new Date().toISOString());
}

export function lastSavedAt(): string | null {
  return localStorage.getItem(SAVED_AT_KEY);
}

export function clearFeatures(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SAVED_AT_KEY);
}
