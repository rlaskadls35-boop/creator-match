import { describe, it, expect } from 'vitest';
import { percentileRanks, displayTopPercent } from './percentile';

describe('percentileRanks (설계 §5.4)', () => {
  it('1등 100점, 꼴등 0점, 가운데 50점', () => {
    const r = percentileRanks([10, 30, 20], true);
    expect(r.map((x) => x.score)).toEqual([0, 100, 50]);
    expect(r.map((x) => x.topPercent)).toEqual([100, 0, 50]);
    expect(r.map((x) => x.rank)).toEqual([3, 1, 2]);
    expect(r[0].groupSize).toBe(3);
  });
  it('동점자는 절반 규칙: [10,20,20,30]에서 20은 (1 + 1/2) / 3 = 50%', () => {
    const r = percentileRanks([10, 20, 20, 30], true);
    expect(r[1].topPercent).toBe(50);
    expect(r[1].score).toBe(50);
    expect(r[2].score).toBe(50);
    expect(r[1].rank).toBe(2);
    expect(r[2].rank).toBe(2);
    expect(r.map((x) => x.tied)).toEqual([false, true, true, false]);
    expect(r.map((x) => x.tieCount)).toEqual([0, 1, 1, 0]);
  });
  it('집단이 1명이면 50점', () => {
    const [r] = percentileRanks([42], true);
    expect(r.score).toBe(50);
    expect(r.topPercent).toBe(50);
    expect(r.rank).toBe(1);
    expect(r.tieCount).toBe(0);
  });
  it('낮을수록 좋음(비용)은 방향이 뒤집힌다', () => {
    const r = percentileRanks([10, 20, 30], false);
    expect(r.map((x) => x.score)).toEqual([100, 50, 0]);
  });
  it('점수는 소수 첫째 자리까지', () => {
    const r = percentileRanks([1, 2, 3, 4, 5, 6, 7], true);
    expect(r[5].score).toBe(83.3); // 상위 16.67% → 100 − 16.67 = 83.3
  });
});

describe('displayTopPercent', () => {
  it('반올림하되 최소 1', () => {
    expect(displayTopPercent(0)).toBe(1);
    expect(displayTopPercent(0.4)).toBe(1);
    expect(displayTopPercent(12.4)).toBe(12);
    expect(displayTopPercent(12.5)).toBe(13);
  });
});
