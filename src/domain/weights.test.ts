import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_WEIGHTS, WEIGHTS_STORAGE_KEY, sumWeights, validateWeights, normalizeWeights,
  weightsSumIs100, loadWeights, saveWeights,
} from './weights';

describe('weights (설계 §5.5, §6.4)', () => {
  beforeEach(() => localStorage.clear());

  it('기본 비중은 30/25/20/15/10, 합 100', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ engagement: 30, views: 25, rating: 20, costPerView: 15, campaigns: 10 });
    expect(sumWeights(DEFAULT_WEIGHTS)).toBe(100);
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
  });

  it('합이 100이 아니거나 정수가 아니거나 범위 밖이면 무효', () => {
    expect(validateWeights({ ...DEFAULT_WEIGHTS, engagement: 40 })).toBe(false);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, engagement: 30.5, views: 24.5 })).toBe(false);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, engagement: -10, views: 65 })).toBe(false);
    expect(validateWeights(null)).toBe(false);
    expect(validateWeights({ engagement: 100 })).toBe(false);
  });

  it('normalizeWeights는 비율을 유지하며 합을 100으로 맞춘다', () => {
    const n = normalizeWeights({ ...DEFAULT_WEIGHTS, engagement: 40 }); // 합 110
    expect(weightsSumIs100(n)).toBe(true);
    expect(n.engagement).toBeCloseTo((40 / 110) * 100, 6);
    expect(normalizeWeights({ engagement: 0, views: 0, rating: 0, costPerView: 0, campaigns: 0 })).toEqual(DEFAULT_WEIGHTS);
  });

  it('저장 → 읽기 왕복', () => {
    const w = { engagement: 50, views: 20, rating: 10, costPerView: 10, campaigns: 10 };
    expect(saveWeights(w)).toBe(true);
    expect(loadWeights()).toEqual(w);
  });

  it('저장된 값이 없거나 손상됐으면 기본값', () => {
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
    localStorage.setItem(WEIGHTS_STORAGE_KEY, '{not json');
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify({ engagement: 90 }));
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
  });

  it('합이 100이 아닌 비중은 저장을 거절한다', () => {
    expect(saveWeights({ ...DEFAULT_WEIGHTS, engagement: 31 })).toBe(false);
    expect(localStorage.getItem(WEIGHTS_STORAGE_KEY)).toBeNull();
  });
});
