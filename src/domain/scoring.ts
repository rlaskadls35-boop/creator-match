import { METRIC_KEYS, TIERS } from './types';
import type { Creator, MetricKey, MetricScore, RankedCreator, ScoredCreator, Weights } from './types';
import { percentileRanks } from './percentile';
import { weightsSumIs100 } from './weights';

interface MetricDef {
  key: MetricKey;
  value: (c: Creator) => number;
  higherIsBetter: boolean;
  scope: 'tier' | 'all';
}

/** 설계 §5.3 표 */
export const METRIC_DEFS: MetricDef[] = [
  { key: 'engagement', value: (c) => c.engagementRate, higherIsBetter: true, scope: 'tier' },
  { key: 'views', value: (c) => c.avgViewCount, higherIsBetter: true, scope: 'tier' },
  { key: 'rating', value: (c) => c.rating, higherIsBetter: true, scope: 'all' },
  { key: 'costPerView', value: (c) => c.costPerView, higherIsBetter: false, scope: 'tier' },
  { key: 'campaigns', value: (c) => c.totalCampaignCount, higherIsBetter: true, scope: 'all' },
];

/** 로드 시 전원에 대해 1회 계산. 검색과 무관 (설계 §5.4) */
export function scoreCreators(creators: Creator[]): ScoredCreator[] {
  const metricsById = new Map<string, Partial<Record<MetricKey, MetricScore>>>();
  const put = (group: Creator[], def: MetricDef, groupLabel: string) => {
    const results = percentileRanks(group.map(def.value), def.higherIsBetter);
    group.forEach((c, i) => {
      const m = metricsById.get(c.id) ?? {};
      m[def.key] = { key: def.key, groupLabel, ...results[i] };
      metricsById.set(c.id, m);
    });
  };
  for (const def of METRIC_DEFS) {
    if (def.scope === 'all') put(creators, def, '전체');
    else for (const t of TIERS) put(creators.filter((c) => c.tier === t), def, t);
  }
  return creators.map((c) => ({ ...c, metrics: metricsById.get(c.id) as Record<MetricKey, MetricScore> }));
}

/** 매칭 점수 = Σ 항목 점수 × 비중 ÷ 100 (반올림은 표시할 때만) */
export function matchScore(c: ScoredCreator, weights: Weights): number {
  return METRIC_KEYS.reduce((sum, k) => sum + (c.metrics[k].score * weights[k]) / 100, 0);
}

/** 동점 정렬: 매칭 점수 desc → 참여율 desc → creator_id asc (설계 §5.5) */
export function compareByMatch(a: RankedCreator, b: RankedCreator): number {
  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
  if (b.engagementRate !== a.engagementRate) return b.engagementRate - a.engagementRate;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function rankCreators(list: ScoredCreator[], weights: Weights): RankedCreator[] {
  if (!weightsSumIs100(weights)) throw new Error('비중 합이 100이어야 합니다.');
  return list.map((c) => ({ ...c, matchScore: matchScore(c, weights) })).sort(compareByMatch);
}
