import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, matchScore, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';

const creators = parseCreators(csvText).creators;
const scored = scoreCreators(creators);
const ranked = rankCreators(scored, DEFAULT_WEIGHTS);
const byId = (id: string) => ranked.find((c) => c.id === id)!;

describe('확인된 네 지표로만 매칭 점수 계산', () => {
  it('신규 27명은 종합순위에서 빠지고 평점·비용 항목점수도 없다', () => {
    expect(ranked).toHaveLength(173);
    for (const c of scored.filter((c) => !c.hasHistory)) {
      expect(c.metrics.rating).toBeUndefined();
      expect(c.metrics.costPerView).toBeUndefined();
      expect(() => matchScore(c, DEFAULT_WEIGHTS)).toThrow('정보가 없어');
    }
    const viewsOnly = rankCreators(scored, { engagement: 0, views: 100, rating: 0, costPerView: 0 });
    expect(viewsOnly.every((c) => c.hasHistory)).toBe(true);
  });

  it('채널 지표는 전체 규모 집단, 평점·비용은 해당 정보가 있는 사람끼리 비교한다', () => {
    const m = byId('C0180').metrics;
    expect(m.engagement.groupSize).toBe(129);
    expect(m.engagement.score).toBe(59);
    expect(m.views.score).toBe(53.1);
    expect(m.rating.groupSize).toBe(173);
    expect(m.costPerView.groupSize).toBe(115);
  });

  it('캠페인 건수만 바뀌어도 점수·순위는 바뀌지 않는다', () => {
    const changed = creators.map((c) => c.hasHistory ? { ...c, totalCampaignCount: 1 } : c);
    const after = rankCreators(scoreCreators(changed), DEFAULT_WEIGHTS);
    expect(after.map((c) => [c.id, c.matchScore])).toEqual(ranked.map((c) => [c.id, c.matchScore]));
  });

  it('비중 합이 100이 아니면 계산을 거절한다', () => {
    expect(() => rankCreators(scored, { ...DEFAULT_WEIGHTS, engagement: 40 })).toThrow();
  });

  it('조회수만 반영하면 이력 있는 후보 중 조회수가 가장 높은 후보가 각 규모 1위다', () => {
    const viewsOnly = rankCreators(scored, { engagement: 0, views: 100, rating: 0, costPerView: 0 });
    for (const tier of ['나노', '마이크로', '매크로']) {
      const group = viewsOnly.filter((c) => c.tier === tier);
      expect(group[0].avgViewCount).toBe(Math.max(...group.map((c) => c.avgViewCount)));
    }
  });

  it('조회수 0 또는 단가 미확인으로 비용을 계산할 수 없으면 종합순위에 넣지 않는다', () => {
    const c = creators.find((c) => c.hasHistory)!;
    const missing = scoreCreators([{ ...c, avgViewCount: 0, costPerView: null }]);
    expect(rankCreators(missing, DEFAULT_WEIGHTS)).toEqual([]);
  });

  it('정렬은 매칭 점수 → 참여율 → creator_id 순이며 소수를 유지한다', () => {
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1], b = ranked[i];
      const ok = a.matchScore > b.matchScore ||
        (a.matchScore === b.matchScore && (a.engagementRate > b.engagementRate ||
          (a.engagementRate === b.engagementRate && a.id < b.id)));
      expect(ok).toBe(true);
    }
  });
});
