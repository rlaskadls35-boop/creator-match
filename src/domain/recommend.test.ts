import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';
import { filterCandidates, sortCandidates, applyResultFilters } from './recommend';
import type { SearchInput } from './recommend';

const ranked = rankCreators(scoreCreators(parseCreators(csvText).creators), DEFAULT_WEIGHTS);
const Q: SearchInput = { budget: 1_500_000, categories: ['뷰티', '패션'], tier: '마이크로' };

describe('filterCandidates (설계 §5.1)', () => {
  it('뷰티+패션 / 마이크로 / 150만 → 18명, 1위 정은매거진77, 2위 민준브이로그180', () => {
    const c = filterCandidates(ranked, Q);
    expect(c).toHaveLength(18);
    expect(c[0].id).toBe('C0077');
    expect(c[1].id).toBe('C0180');
  });
  it('예산 경계: 단가 == 예산은 포함 (민석스토리37, 테크·마이크로 1,500,000)', () => {
    const at = filterCandidates(ranked, { budget: 1_500_000, categories: ['테크'], tier: '마이크로' });
    const below = filterCandidates(ranked, { budget: 1_499_999, categories: ['테크'], tier: '마이크로' });
    expect(at.some((c) => c.id === 'C0037')).toBe(true);
    expect(below.some((c) => c.id === 'C0037')).toBe(false);
  });
  it('이력 없는 사람은 예상 단가로 판정된다 (C0036 예상 132만 → 150만 예산에 포함, 130만엔 제외)', () => {
    expect(filterCandidates(ranked, Q).some((c) => c.id === 'C0036')).toBe(true);
    expect(filterCandidates(ranked, { ...Q, budget: 1_300_000 }).some((c) => c.id === 'C0036')).toBe(false);
  });
});

describe('sortCandidates (설계 §5.10)', () => {
  const cands = filterCandidates(ranked, Q);

  it('기본(매칭 점수 desc)은 rankCreators 순서와 같다', () => {
    const s = sortCandidates(cands, { key: 'match', direction: 'desc' });
    expect(s.map((c) => c.id)).toEqual(cands.map((c) => c.id));
  });
  it('평점순: 이력 없음 3명(C0036, C0109, C0145)이 맨 아래, 나머지는 평점 desc', () => {
    const s = sortCandidates(cands, { key: 'rating', direction: 'desc' });
    expect(s.slice(-3).map((c) => c.hasHistory)).toEqual([false, false, false]);
    expect(new Set(s.slice(-3).map((c) => c.id))).toEqual(new Set(['C0036', 'C0109', 'C0145']));
    expect(s[0].rating).toBe(5.0);
    expect(s[0].id).toBe('C0077'); // 5.0 동점(C0077, C0078) → 매칭 점수 높은 순
  });
  it('평점 낮은 순(asc)에서도 이력 없음은 맨 아래 (L21)', () => {
    const s = sortCandidates(cands, { key: 'rating', direction: 'asc' });
    expect(s.slice(-3).every((c) => !c.hasHistory)).toBe(true);
    expect(s[0].rating).toBe(4.0);
  });
  it('단가 낮은 순: 예상 단가(132만)가 실제 단가 사이에 섞여 정렬된다', () => {
    const s = sortCandidates(cands, { key: 'rate', direction: 'asc' });
    expect(s[0].id).toBe('C0177'); // 540,000
    const rates = s.map((c) => c.rate);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
    const idx = s.findIndex((c) => c.id === 'C0036');
    expect(s[idx - 1].rate).toBeLessThanOrEqual(1_320_000);
    expect(s[idx + 3].rate).toBeGreaterThanOrEqual(1_320_000);
  });
  it('참여율 동점(8.1: C0036, C0066, C0177)은 매칭 점수 순으로', () => {
    const s = sortCandidates(cands, { key: 'engagement', direction: 'desc' });
    expect(s.slice(0, 3).map((c) => c.id)).toEqual(['C0036', 'C0066', 'C0177']);
  });
  it('원본 배열을 바꾸지 않는다', () => {
    const before = cands.map((c) => c.id);
    sortCandidates(cands, { key: 'rate', direction: 'asc' });
    expect(cands.map((c) => c.id)).toEqual(before);
  });
});

describe('applyResultFilters (설계 §5.10 필터)', () => {
  const cands = filterCandidates(ranked, Q);
  it('유튜브만 → 7명, 이력 있는 사람만 → 15명, 둘 다 → 5명', () => {
    expect(applyResultFilters(cands, { platform: '유튜브', historyOnly: false })).toHaveLength(7);
    expect(applyResultFilters(cands, { platform: 'all', historyOnly: true })).toHaveLength(15);
    expect(applyResultFilters(cands, { platform: '유튜브', historyOnly: true })).toHaveLength(5);
  });
});
