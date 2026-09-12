import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, matchScore, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';

const scored = scoreCreators(parseCreators(csvText).creators);
const byId = (id: string) => scored.find((c) => c.id === id)!;

describe('scoreCreators (설계 §5.3, §5.4)', () => {
  it('민준브이로그180(C0180)의 항목 점수 = 59.0 / 53.1 / 74.9 / 71.1 / 93.7', () => {
    const m = byId('C0180').metrics;
    expect(m.engagement.score).toBe(59.0);
    expect(m.views.score).toBe(53.1);
    expect(m.rating.score).toBe(74.9);
    expect(m.costPerView.score).toBe(71.1);
    expect(m.campaigns.score).toBe(93.7);
  });

  it('비교 집단: 참여율·조회수·비용은 같은 tier(129명), 평점·건수는 전체(200명)', () => {
    const m = byId('C0180').metrics;
    expect(m.engagement.groupLabel).toBe('마이크로');
    expect(m.engagement.groupSize).toBe(129);
    expect(m.engagement.rank).toBe(53);
    expect(m.rating.groupLabel).toBe('전체');
    expect(m.rating.groupSize).toBe(200);
    expect(m.campaigns.rank).toBe(10);
  });

  it('정은매거진77(C0077)은 평점 전체 1등, 비용 마이크로 2등', () => {
    const m = byId('C0077').metrics;
    expect(m.rating.rank).toBe(1);
    expect(m.rating.score).toBe(95.7); // 5.0 동점자가 많아 100이 아니다
    expect(m.costPerView.rank).toBe(2);
    expect(m.costPerView.score).toBe(99.2);
  });
});

describe('matchScore / rankCreators (설계 §5.5)', () => {
  it('기본 비중에서 민준브이로그180 = 65.99 → 표시 66', () => {
    const s = matchScore(byId('C0180'), DEFAULT_WEIGHTS);
    expect(s).toBeCloseTo(65.99, 2);
    expect(Math.round(s)).toBe(66);
  });

  it('비중 합이 100이 아니면 오류', () => {
    expect(() => rankCreators(scored, { ...DEFAULT_WEIGHTS, engagement: 40 })).toThrow();
  });

  it('비중을 바꾸면 순위가 바뀐다', () => {
    const base = rankCreators(scored, DEFAULT_WEIGHTS);
    const campaignsOnly = rankCreators(scored, { engagement: 0, views: 0, rating: 0, costPerView: 0, campaigns: 100 });
    expect(base[0].id).not.toBe(campaignsOnly[0].id);
    expect(campaignsOnly[0].totalCampaignCount).toBe(30); // 최대 건수(30건, 4명 동점)인 사람이 맨 위
  });

  it('정렬은 매칭 점수 → 참여율 → creator_id 순, 매칭 점수는 소수 그대로', () => {
    const ranked = rankCreators(scored, DEFAULT_WEIGHTS);
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1], b = ranked[i];
      const ok = a.matchScore > b.matchScore ||
        (a.matchScore === b.matchScore && (a.engagementRate > b.engagementRate ||
          (a.engagementRate === b.engagementRate && a.id < b.id)));
      expect(ok).toBe(true);
    }
  });
});
