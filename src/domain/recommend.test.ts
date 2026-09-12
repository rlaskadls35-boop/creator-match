import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';
import { filterCandidates, sortCandidates, applyResultFilters, filterNewCandidates, sortNewCandidates } from './recommend';
import type { SearchInput } from './recommend';

const all = scoreCreators(parseCreators(csvText).creators);
const ranked = rankCreators(all, DEFAULT_WEIGHTS);
const Q: SearchInput = { platform: 'all', budget: 1_500_000, categories: ['뷰티', '패션'], tier: '마이크로' };

describe('filterCandidates (설계 §5.1)', () => {
  it('뷰티+패션 / 마이크로 / 150만 → 이력 있는 후보 6명, 1위 정은매거진77', () => {
    const c = filterCandidates(ranked, Q);
    expect(c).toHaveLength(6);
    expect(c[0].id).toBe('C0077');
    expect(c[0].matchScore).toBeCloseTo(72.839, 3);
  });
  it('예산 경계: 단가 == 예산은 포함 (민석스토리37, 테크·마이크로 1,500,000)', () => {
    const at = filterCandidates(ranked, { ...Q, budget: 1_500_000, categories: ['테크'] });
    const below = filterCandidates(ranked, { ...Q, budget: 1_499_999, categories: ['테크'] });
    expect(at.some((c) => c.id === 'C0037')).toBe(true);
    expect(below.some((c) => c.id === 'C0037')).toBe(false);
  });
  it('플랫폼은 검색 전에 기존·신규 후보 모두에 적용한다', () => {
    expect(filterCandidates(ranked, { ...Q, platform: '유튜브' })).toHaveLength(3);
    expect(filterNewCandidates(all, { ...Q, platform: '유튜브' })).toHaveLength(1);
  });
  it('신규는 예산에 관계없이 별도 후보이며 종합 후보에는 포함하지 않는다', () => {
    expect(filterCandidates(ranked, Q).some((c) => c.id === 'C0036')).toBe(false);
    const fresh = filterNewCandidates(all, Q);
    expect(fresh.map((c) => c.id)).toContain('C0036');
    expect(filterNewCandidates(all, { ...Q, budget: 1 })).toEqual(fresh);
    expect(fresh.every((c) => !c.hasHistory && Q.categories.includes(c.category) && c.tier === Q.tier)).toBe(true);
    expect(sortNewCandidates(fresh, { key: 'views', direction: 'desc' })[0].avgViewCount).toBe(Math.max(...fresh.map((c) => c.avgViewCount)));
  });
});

describe('sortCandidates (설계 §5.10)', () => {
  const cands = filterCandidates(ranked, Q);

  it('기본(매칭 점수 desc)은 rankCreators 순서와 같다', () => {
    const s = sortCandidates(cands, { key: 'match', direction: 'desc' });
    expect(s.map((c) => c.id)).toEqual(cands.map((c) => c.id));
  });
  it('평점·단가 정렬에는 기록이 있는 후보만 포함된다', () => {
    const ratings = sortCandidates(cands, { key: 'rating', direction: 'asc' });
    expect(ratings.every((c) => c.hasHistory)).toBe(true);
    expect(ratings.map((c) => c.rating)).toEqual([...ratings.map((c) => c.rating)].sort((a, b) => a - b));
    const rates = sortCandidates(cands, { key: 'rate', direction: 'asc' });
    expect(rates[0].id).toBe('C0183');
    expect(rates.map((c) => c.rate)).toEqual([...rates.map((c) => c.rate)].sort((a, b) => a - b));
  });
  it('참여율 동점에서는 매칭 점수로 순서를 정한다', () => {
    const tied = cands.filter((c) => ['C0066', 'C0180'].includes(c.id))
      .map((c) => ({ ...c, engagementRate: 8.1 }));
    const s = sortCandidates(tied, { key: 'engagement', direction: 'desc' });
    expect(s.map((c) => c.id)).toEqual(['C0180', 'C0066']);
  });
  it('원본 배열을 바꾸지 않는다', () => {
    const before = cands.map((c) => c.id);
    sortCandidates(cands, { key: 'rate', direction: 'asc' });
    expect(cands.map((c) => c.id)).toEqual(before);
  });
});

describe('applyResultFilters (설계 §5.10 필터)', () => {
  const cands = filterCandidates(ranked, Q);
  it('검색 후에는 이력 필터만 적용한다', () => {
    expect(applyResultFilters(cands, { historyOnly: false })).toHaveLength(6);
    expect(applyResultFilters(cands, { historyOnly: true })).toHaveLength(6);
  });
});
