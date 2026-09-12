import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_WEIGHTS, WEIGHTS_STORAGE_KEY, sumWeights, validateWeights,
  weightsSumIs100, loadWeights, saveWeights,
  toDraft, draftSum, draftInRange, draftToWeights, draftEquals,
} from './weights';

describe('weights (설계 §5.5, §6.4)', () => {
  beforeEach(() => localStorage.clear());

  it('확정 기본 비중은 참여율 30, 조회수 20, 평점 10, 비용 40, 합 100', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ engagement: 30, views: 20, rating: 10, costPerView: 40 });
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

  it('입력 중인 비중(draft): 합이 정확히 100일 때만 실제 비중이 된다 (L23)', () => {
    const draft = toDraft(DEFAULT_WEIGHTS);
    expect(draftSum(draft)).toBe(100);
    expect(draftToWeights(draft)).toEqual(DEFAULT_WEIGHTS);
    expect(weightsSumIs100(draftToWeights(draft)!)).toBe(true);
    expect(draftEquals(draft, DEFAULT_WEIGHTS)).toBe(true);

    const over = { ...draft, engagement: 40 }; // 합 110
    expect(draftSum(over)).toBe(110);
    expect(draftToWeights(over)).toBeNull();
    expect(draftEquals(over, DEFAULT_WEIGHTS)).toBe(false);
  });

  it('빈 칸은 0으로 세지만 유효하지 않다', () => {
    const empty = { ...toDraft(DEFAULT_WEIGHTS), views: null };
    expect(draftSum(empty)).toBe(80);
    expect(draftInRange(empty)).toBe(false);
    expect(draftToWeights(empty)).toBeNull();
  });

  it('0~100 범위를 벗어나거나 정수가 아니면 유효하지 않다', () => {
    expect(draftInRange({ ...toDraft(DEFAULT_WEIGHTS), engagement: 120, views: -20 })).toBe(false);
    expect(draftInRange({ ...toDraft(DEFAULT_WEIGHTS), engagement: 30.5, views: 24.5 })).toBe(false);
    expect(draftInRange(toDraft(DEFAULT_WEIGHTS))).toBe(true);
  });

  it('저장 → 읽기 왕복', () => {
    const w = { engagement: 50, views: 20, rating: 10, costPerView: 20 };
    expect(saveWeights(w)).toBe(true);
    expect(loadWeights()).toEqual(w);
  });

  it('기존 다섯 비중을 읽으면 건수를 빼고 남은 비율을 유지한다', () => {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify({ engagement: 40, views: 20, rating: 20, costPerView: 10, campaigns: 10 }));
    expect(loadWeights()).toEqual({ engagement: 45, views: 22, rating: 22, costPerView: 11 });
    expect(JSON.parse(localStorage.getItem(WEIGHTS_STORAGE_KEY)!).campaigns).toBe(10);
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify({ engagement: 0, views: 0, rating: 0, costPerView: 0, campaigns: 100 }));
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
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
