import { METRIC_KEYS } from './types';
import type { MetricKey, Weights } from './types';

export const WEIGHTS_STORAGE_KEY = 'creator-match.weights';

/** 기존 30:25:20:15 비율을 합계 100으로 환산한 임시값. 최적 비중을 의미하지 않는다 */
export const DEFAULT_WEIGHTS: Weights = { engagement: 33, views: 28, rating: 22, costPerView: 17 };

export const METRIC_LABEL: Record<MetricKey, string> = {
  engagement: '참여율',
  views: '평균 조회수',
  rating: '광고주 평점',
  costPerView: '조회 1회당 평균 비용',
};

/** 비중을 올리면 어떤 크리에이터가 위로 오는지 한 줄 설명 (운영자 화면, L23) */
export const METRIC_HINT: Record<MetricKey, string> = {
  engagement: '반응이 높은 채널을 우선',
  views: '조회수가 높은 채널을 우선',
  rating: '평가가 좋은 채널을 우선',
  costPerView: '조회당 비용이 낮은 채널을 우선',
};

export function sumWeights(w: Weights): number {
  return METRIC_KEYS.reduce((s, k) => s + w[k], 0);
}

/** 저장용 검증: 네 항목 모두 0~100 정수이고 합이 정확히 100 */
export function validateWeights(value: unknown): value is Weights {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== METRIC_KEYS.length) return false;
  for (const k of METRIC_KEYS) {
    const v = obj[k];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100) return false;
  }
  return sumWeights(obj as Weights) === 100;
}

/** 계산용 검증: 실수 허용, 음수 없음, 합 100 (부동소수 오차 허용) */
export function weightsSumIs100(w: Weights): boolean {
  return METRIC_KEYS.every((k) => w[k] >= 0) && Math.abs(sumWeights(w) - 100) < 1e-6;
}

/**
 * 운영자가 입력하는 중인 비중. 숫자 칸을 지우면 잠시 빈 값이 되므로 null을 허용한다 (L23)
 */
export type WeightsDraft = Record<MetricKey, number | null>;

export function toDraft(w: Weights): WeightsDraft {
  return { ...w };
}

/** 빈 칸은 0으로 세어 합계를 보여 준다 */
export function draftSum(d: WeightsDraft): number {
  return METRIC_KEYS.reduce((s, k) => s + (d[k] ?? 0), 0);
}

/** 네 칸이 모두 0~100 정수 (합계는 따지지 않음) */
export function draftInRange(d: WeightsDraft): boolean {
  return METRIC_KEYS.every((k) => {
    const v = d[k];
    return v !== null && Number.isInteger(v) && v >= 0 && v <= 100;
  });
}

/** 합계가 정확히 100일 때만 실제 비중이 된다. 아니면 null (미리보기·저장 모두 보류) */
export function draftToWeights(d: WeightsDraft): Weights | null {
  if (!draftInRange(d) || draftSum(d) !== 100) return null;
  const out = {} as Weights;
  for (const k of METRIC_KEYS) out[k] = d[k] as number;
  return out;
}

export function draftEquals(d: WeightsDraft, w: Weights): boolean {
  return METRIC_KEYS.every((k) => d[k] === w[k]);
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadWeights(storage: Storage | null = defaultStorage()): Weights {
  if (!storage) return { ...DEFAULT_WEIGHTS };
  try {
    const raw = storage.getItem(WEIGHTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WEIGHTS };
    const parsed: unknown = JSON.parse(raw);
    return validateWeights(parsed) ? { ...parsed } : migrateLegacyWeights(parsed) ?? { ...DEFAULT_WEIGHTS };
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
}

export function saveWeights(w: Weights, storage: Storage | null = defaultStorage()): boolean {
  if (!storage || !validateWeights(w)) return false;
  try {
    storage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(w));
    return true;
  } catch {
    return false;
  }
}

/** 기존 다섯 항목 저장값은 건수를 제외하고 나머지 비율을 유지한다. 저장은 사용자 동작 때만 한다. */
export function migrateLegacyWeights(value: unknown): Weights | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const keys = [...METRIC_KEYS, 'campaigns'];
  if (Object.keys(obj).length !== keys.length || keys.some((k) => typeof obj[k] !== 'number' || !Number.isInteger(obj[k]) || (obj[k] as number) < 0 || (obj[k] as number) > 100)) return null;
  if (keys.reduce((sum, k) => sum + (obj[k] as number), 0) !== 100) return null;
  const total = METRIC_KEYS.reduce((sum, k) => sum + (obj[k] as number), 0);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  const scaled = METRIC_KEYS.map((key) => ({ key, exact: (obj[key] as number) / total * 100 }));
  const result = Object.fromEntries(scaled.map(({ key, exact }) => [key, Math.floor(exact)])) as Weights;
  let remaining = 100 - sumWeights(result);
  for (const item of [...scaled].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (remaining-- <= 0) break;
    result[item.key] += 1;
  }
  return result;
}
