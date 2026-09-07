import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre GL JS v6 ships as ES modules only, and `import.meta.url`-based
// worker resolution doesn't reliably work inside a bundler's module graph.
// `?worker&url` (not plain `?url`) routes the worker file through Vite's
// worker pipeline so its `maplibre-gl-shared.mjs` sibling import is bundled
// in too, rather than being emitted verbatim and failing on first import.
// See https://maplibre.org/maplibre-gl-js/docs/API/ (Installation, Vite tab).
// Confirmed necessary by direct reproduction: without this, `map.on('load')`
// never fires and no tiles ever request (DECISIONS.md参照).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

import { BASEMAP_STYLES, DEFAULT_BASEMAP, TERRAIN_SOURCE, TEST_AREA } from './mapSources';
import type { BasemapId } from './mapSources';
import { CATEGORY_LABELS, STATUS_LABELS, defaultProperties } from './schema';
import type { Category, NuyeProperties, Status } from './schema';
import { loadFeatures, saveFeatures, lastSavedAt, clearFeatures } from './storage';
import { downloadGeoJSON, parseGeoJSONFile } from './geojson';
import './style.css';

setWorkerUrl(workerUrl);

// ---------------------------------------------------------------------------
// レイアウト
// ---------------------------------------------------------------------------

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="topbar">
    <div id="brand">Nuye</div>
    <div id="basemap-switch"></div>
    <div id="save-status"></div>
  </div>
  <div id="body">
    <div id="sidebar">
      <div id="draw-tools"></div>
      <div id="io-tools"></div>
      <div id="feature-list"></div>
    </div>
    <div id="map"></div>
  </div>
  <div id="attribute-panel"></div>
`;

const drawToolsEl = document.querySelector<HTMLDivElement>('#draw-tools')!;
const ioToolsEl = document.querySelector<HTMLDivElement>('#io-tools')!;
const featureListEl = document.querySelector<HTMLDivElement>('#feature-list')!;
const attributePanelEl = document.querySelector<HTMLDivElement>('#attribute-panel')!;
const basemapSwitchEl = document.querySelector<HTMLDivElement>('#basemap-switch')!;
const saveStatusEl = document.querySelector<HTMLDivElement>('#save-status')!;

// terra-drawのgetSnapshot()には、選択中フィーチャーの編集ハンドル(selectionPoint)
// や線・面の中点ハンドル(midPoint)といった、描画UIのための内部フィーチャーも
// 混ざって返ってくる(nuyeの属性を持たない)。それらはnuyeの「書き込み」ではないので、
// 保存・一覧表示・持出しのいずれからも除外する——`properties.id`の有無で判別する
// (nuyeが作るフィーチャーは必ずschema.tsのdefaultProperties()でidを持つため)。
function getDataFeatures(instance: TerraDraw): GeoJSON.Feature[] {
  return (instance.getSnapshot() as unknown as GeoJSON.Feature[]).filter(
    (f) => (f.properties as Record<string, unknown> | null)?.id !== undefined
  );
}

// ---------------------------------------------------------------------------
// 地図
// ---------------------------------------------------------------------------

let currentBasemap: BasemapId = DEFAULT_BASEMAP;

const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAP_STYLES[currentBasemap],
  center: [TEST_AREA.center.lng, TEST_AREA.center.lat],
  zoom: TEST_AREA.zoom,
  attributionControl: false
});
map.addControl(new maplibregl.AttributionControl({ compact: true }));
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.on('error', (e) => console.error('[nuye] maplibre error', e.error));

// CSSグリッドレイアウトでは#mapの実サイズがMapLibre初期化時点ではまだ確定して
// いないことがある(初回描画がおかしなキャンバスサイズになる)。#mapのサイズ変化を
// 継続的に監視してresize()する——初期化タイミング問題だけでなく、サイドバー幅の
// 変化等にも今後頑健になる。
const mapContainer = document.getElementById('map')!;
new ResizeObserver(() => map.resize()).observe(mapContainer);

// ---------------------------------------------------------------------------
// 描画(terra-draw)
//
// map.setStyle()はterra-drawのアダプタが地図に直接addしたsource/layerも
// 巻き込んで消し去るため、ベースマップ切替のたびにTerraDrawインスタンスを
// 作り直す(既存フィーチャーはスナップショットとして引き継ぐ)。
// say-your-gridのグリッド枠再描画で踏んだのと同種の問題への対処——
// 詳細はDECISIONS.md参照。
// ---------------------------------------------------------------------------

let draw: TerraDraw;

function buildDraw(initialFeatures: GeoJSON.Feature[]): TerraDraw {
  const adapter = new TerraDrawMapLibreGLAdapter({ map });
  const instance = new TerraDraw({
    adapter,
    modes: [
      new TerraDrawPointMode(),
      new TerraDrawLineStringMode(),
      new TerraDrawPolygonMode(),
      new TerraDrawSelectMode({
        flags: {
          point: { feature: { draggable: true, coordinates: { deletable: false } } },
          linestring: {
            feature: {
              draggable: true,
              coordinates: { draggable: true, deletable: true, midpoints: true }
            }
          },
          polygon: {
            feature: {
              draggable: true,
              coordinates: { draggable: true, deletable: true, midpoints: true }
            }
          }
        }
      })
    ]
  });

  instance.start();
  if (initialFeatures.length) {
    instance.addFeatures(initialFeatures as unknown as Parameters<TerraDraw['addFeatures']>[0]);
  }
  instance.setMode('select');

  instance.on('finish', (id) => {
    // 新規フィーチャーが描き終わった直後: nuyeの属性を初期値として付与し、
    // すぐ選択状態にして属性パネルを開く(起動プロンプト10.7に相当する導線)。
    const snap = instance.getSnapshotFeature(id);
    if (!snap) return;
    const props = snap.properties as Record<string, unknown>;
    if (!props.id) {
      const filled = defaultProperties(inferCategory(snap.geometry.type));
      instance.updateFeatureProperties(id, filled as unknown as Record<string, GeoJSON.GeoJsonProperties>);
    }
    instance.selectFeature(id);
  });

  instance.on('change', () => persist(instance));
  instance.on('select', () => renderAttributePanel(instance));
  instance.on('deselect', () => renderAttributePanel(instance));

  return instance;
}

function inferCategory(geomType: string): Category {
  if (geomType === 'Point') return 'observation';
  if (geomType === 'LineString') return 'route';
  if (geomType === 'Polygon') return 'area';
  return 'other';
}

function persist(instance: TerraDraw): void {
  saveFeatures(getDataFeatures(instance));
  renderFeatureList(instance);
  renderSaveStatus();
}

map.on('load', () => {
  draw = buildDraw(loadFeatures());
  persist(draw);
  renderDrawTools();
  renderBasemapSwitch();
  renderIOTools();
  renderSaveStatus();
});

// ---------------------------------------------------------------------------
// ベースマップ切替
// ---------------------------------------------------------------------------

function switchBasemap(id: BasemapId): void {
  if (id === currentBasemap) return;
  const snapshot = getDataFeatures(draw);
  currentBasemap = id;
  map.setStyle(BASEMAP_STYLES[id]);
  map.once('style.load', () => {
    draw = buildDraw(snapshot);
    renderFeatureList(draw);
    renderBasemapSwitch();
  });
}

function renderBasemapSwitch(): void {
  basemapSwitchEl.innerHTML = '';
  (Object.keys(BASEMAP_STYLES) as BasemapId[]).forEach((id) => {
    const btn = document.createElement('button');
    btn.textContent = id === 'positron' ? 'Positron' : 'BVMap';
    btn.className = id === currentBasemap ? 'active' : '';
    btn.addEventListener('click', () => switchBasemap(id));
    basemapSwitchEl.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// 描画ツール(サイドバー)
// ---------------------------------------------------------------------------

const TOOLS: { mode: string; label: string }[] = [
  { mode: 'select', label: '選択' },
  { mode: 'point', label: '点' },
  { mode: 'linestring', label: '線' },
  { mode: 'polygon', label: '面' }
];

function renderDrawTools(): void {
  drawToolsEl.innerHTML = '<h2>描く</h2>';
  const row = document.createElement('div');
  row.className = 'tool-row';
  TOOLS.forEach((t) => {
    const btn = document.createElement('button');
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      draw.setMode(t.mode);
      [...row.children].forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
    });
    if (t.mode === 'select') btn.classList.add('active');
    row.appendChild(btn);
  });
  drawToolsEl.appendChild(row);
}

// ---------------------------------------------------------------------------
// 持出し・再読込・全消去(サイドバー)
// ---------------------------------------------------------------------------

function renderIOTools(): void {
  ioToolsEl.innerHTML = '<h2>持出し・読込</h2>';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'GeoJSONをダウンロード';
  exportBtn.addEventListener('click', () => {
    downloadGeoJSON(getDataFeatures(draw));
  });
  ioToolsEl.appendChild(exportBtn);

  const importLabel = document.createElement('label');
  importLabel.className = 'file-input-label';
  importLabel.textContent = 'GeoJSONを読込';
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.geojson,.json,application/geo+json,application/json';
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const { features, warnings } = parseGeoJSONFile(text);
      const replace = confirm(
        `${features.length}件のフィーチャーを読み込みます。\n\nOK: 現在の内容を置き換える\nキャンセル: 現在の内容に追加する`
      );
      if (replace) {
        draw.clear();
      }
      if (features.length) {
        draw.addFeatures(features as unknown as Parameters<TerraDraw['addFeatures']>[0]);
      }
      if (warnings.length) {
        alert(`一部のフィーチャーを読み込めませんでした:\n\n${warnings.join('\n')}`);
      }
    } catch (err) {
      alert(`読込に失敗しました: ${(err as Error).message}`);
    } finally {
      importInput.value = '';
    }
  });
  importLabel.appendChild(importInput);
  ioToolsEl.appendChild(importLabel);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'すべて消去';
  clearBtn.className = 'danger';
  clearBtn.addEventListener('click', () => {
    if (!confirm('保存されている書き込みをすべて消去します。よろしいですか?')) return;
    draw.clear();
    clearFeatures();
    renderSaveStatus();
  });
  ioToolsEl.appendChild(clearBtn);
}

// ---------------------------------------------------------------------------
// フィーチャー一覧(サイドバー)
// ---------------------------------------------------------------------------

function renderFeatureList(instance: TerraDraw): void {
  const snapshot = getDataFeatures(instance);
  featureListEl.innerHTML = `<h2>書き込み一覧 (${snapshot.length})</h2>`;
  const list = document.createElement('ul');
  snapshot.forEach((f) => {
    const props = (f.properties ?? {}) as Partial<NuyeProperties>;
    const li = document.createElement('li');
    li.textContent = props.name?.trim() ? props.name : '(無題)';
    const badge = document.createElement('span');
    badge.className = `badge status-${props.status ?? 'unconfirmed'}`;
    badge.textContent = STATUS_LABELS[(props.status as Status) ?? 'unconfirmed'];
    li.appendChild(badge);
    li.addEventListener('click', () => {
      instance.setMode('select');
      instance.selectFeature(f.id as string | number);
      renderAttributePanel(instance);
    });
    list.appendChild(li);
  });
  featureListEl.appendChild(list);
}

// ---------------------------------------------------------------------------
// 属性パネル(下部)
// ---------------------------------------------------------------------------

// 'selected'というプロパティ名はterra-draw自身が使う内部マーカー
// (common.d.tsの`SELECT_PROPERTIES.SELECTED === "selected"`で確認済み)。
function getSelectedId(instance: TerraDraw): string | number | undefined {
  const snapshot = instance.getSnapshot();
  const selected = snapshot.find((f) => (f.properties as Record<string, unknown>)?.selected === true);
  return selected?.id;
}

function renderAttributePanel(instance: TerraDraw): void {
  const id = getSelectedId(instance);
  if (id === undefined) {
    attributePanelEl.innerHTML = '<p class="hint">地図上のフィーチャーを選択すると、ここで属性を編集できます。</p>';
    return;
  }
  const feature = instance.getSnapshotFeature(id);
  if (!feature) {
    attributePanelEl.innerHTML = '';
    return;
  }
  const props = (feature.properties ?? {}) as Partial<NuyeProperties>;

  attributePanelEl.innerHTML = '';
  const form = document.createElement('div');
  form.className = 'attr-form';

  const update = (patch: Partial<NuyeProperties>) => {
    instance.updateFeatureProperties(id, {
      ...patch,
      updated_at: new Date().toISOString()
    } as unknown as Record<string, GeoJSON.GeoJsonProperties>);
  };

  form.appendChild(textField('名称', props.name ?? '', (v) => update({ name: v })));
  form.appendChild(
    selectField(
      'カテゴリ',
      CATEGORY_LABELS,
      (props.category as Category) ?? 'observation',
      (v) => update({ category: v as Category })
    )
  );
  form.appendChild(
    selectField('状態', STATUS_LABELS, (props.status as Status) ?? 'unconfirmed', (v) => update({ status: v as Status }))
  );
  form.appendChild(textField('観測者', props.observer ?? '', (v) => update({ observer: v })));
  form.appendChild(textareaField('注記', props.notes ?? '', (v) => update({ notes: v })));
  form.appendChild(textField('次の行動', props.next_action ?? '', (v) => update({ next_action: v })));
  form.appendChild(textField('出典', props.source ?? 'nuye', (v) => update({ source: v })));

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'このフィーチャーを削除';
  deleteBtn.className = 'danger';
  deleteBtn.addEventListener('click', () => {
    instance.removeFeatures([id]);
    attributePanelEl.innerHTML = '';
  });
  form.appendChild(deleteBtn);

  attributePanelEl.appendChild(form);
}

function textField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  wrap.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('change', () => onChange(input.value));
  wrap.appendChild(input);
  return wrap;
}

function textareaField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  wrap.textContent = label;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.rows = 3;
  textarea.addEventListener('change', () => onChange(textarea.value));
  wrap.appendChild(textarea);
  return wrap;
}

function selectField<T extends string>(
  label: string,
  options: Record<T, string>,
  value: T,
  onChange: (v: T) => void
): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  wrap.textContent = label;
  const select = document.createElement('select');
  (Object.keys(options) as T[]).forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = options[key];
    opt.selected = key === value;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => onChange(select.value as T));
  wrap.appendChild(select);
  return wrap;
}

// ---------------------------------------------------------------------------
// 保存状態表示
// ---------------------------------------------------------------------------

function renderSaveStatus(): void {
  const at = lastSavedAt();
  saveStatusEl.textContent = at ? `保存済み ${new Date(at).toLocaleTimeString('ja-JP')}` : '未保存';
}

// TERRAIN_SOURCEは今回のPhase 2縦切りではまだ使わない(Phase 4で統合予定、
// HANDOVER.md参照)。importして未使用のままでは型チェックに引っかかるため、
// ここで参照だけしておく。
void TERRAIN_SOURCE;
