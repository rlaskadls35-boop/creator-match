import { METRIC_KEYS } from './types';
import type { MetricKey, Weights } from './types';

export const WEIGHTS_STORAGE_KEY = 'creator-match.weights';

/** 기본 비중(임시, 설계 D9). 운영자 화면 실험 후 확정값으로 바꾼다 */
export const DEFAULT_WEIGHTS: Weights = { engagement: 30, views: 25, rating: 20, costPerView: 15, campaigns: 10 };

export const METRIC_LABEL: Record<MetricKey, string> = {
  engagement: '참여율',
  views: '평균 조회수',
  rating: '광고주 평점',
  costPerView: '조회 1회당 평균 비용',
  campaigns: '캠페인 건수',
};

export function sumWeights(w: Weights): number {
  return METRIC_KEYS.reduce((s, k) => s + w[k], 0);
}

/** 저장용 검증: 다섯 항목 모두 0~100 정수이고 합이 정확히 100 */
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

/** 합이 100이 아닌 비중을 비율로 환산 (운영자 미리보기용, L21). 합이 0이면 기본값 */
export function normalizeWeights(w: Weights): Weights {
  const s = sumWeights(w);
  if (s <= 0) return { ...DEFAULT_WEIGHTS };
  const out = {} as Weights;
  for (const k of METRIC_KEYS) out[k] = (w[k] / s) * 100;
  return out;
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
    return validateWeights(parsed) ? { ...parsed } : { ...DEFAULT_WEIGHTS };
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
