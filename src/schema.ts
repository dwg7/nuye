// フィーチャー属性のスキーマ。MMGIS Draw Toolはファイルごとのテンプレート駆動フォームだが
// (MMGIS_REVIEW.md参照)、初期MVPでは固定スキーマ1本に絞る——動的テンプレートは複雑さに
// 見合う需要がまだ確認できていないため、必要になった時点で拡張する。

export type Category =
  | 'observation'
  | 'route'
  | 'area'
  | 'hazard'
  | 'facility'
  | 'photo'
  | 'instruction'
  | 'next_action'
  | 'other';

export type Status =
  | 'planned'
  | 'unconfirmed'
  | 'in_progress'
  | 'confirmed'
  | 'needs_review'
  | 'completed';

export interface NuyeProperties {
  id: string;
  name: string;
  category: Category;
  status: Status;
  observed_at: string | null;
  observer: string;
  notes: string;
  source: string;
  next_action: string;
  updated_at: string | null;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  observation: '観測',
  route: '経路',
  area: '区域',
  hazard: '危険箇所',
  facility: '施設',
  photo: '写真地点',
  instruction: '指示',
  next_action: '次の行動',
  other: 'その他'
};

export const STATUS_LABELS: Record<Status, string> = {
  planned: '確認予定',
  unconfirmed: '未確認',
  in_progress: '確認中',
  confirmed: '確認済み',
  needs_review: '要再確認',
  completed: '完了'
};

export function defaultProperties(category: Category = 'observation'): NuyeProperties {
  return {
    id: crypto.randomUUID(),
    name: '',
    category,
    status: 'unconfirmed',
    observed_at: null,
    observer: '',
    notes: '',
    source: 'nuye',
    next_action: '',
    updated_at: null
  };
}
