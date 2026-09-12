import { METRIC_KEYS, TIERS } from './types';
import type { Creator, MetricKey, MetricScore, RankedCreator, ScoredCreator, Weights } from './types';
import { percentileRanks } from './percentile';
import { weightsSumIs100 } from './weights';

interface MetricDef {
  key: MetricKey;
  value: (c: Creator) => number | null;
  higherIsBetter: boolean;
  scope: 'tier' | 'all';
}

/** 설계 §5.3 표 */
export const METRIC_DEFS: MetricDef[] = [
  { key: 'engagement', value: (c) => c.engagementRate, higherIsBetter: true, scope: 'tier' },
  { key: 'views', value: (c) => c.avgViewCount, higherIsBetter: true, scope: 'tier' },
  { key: 'rating', value: (c) => c.rating, higherIsBetter: true, scope: 'all' },
  { key: 'costPerView', value: (c) => c.costPerView, higherIsBetter: false, scope: 'tier' },
];

/** 로드 시 전원에 대해 1회 계산. 검색과 무관 (설계 §5.4) */
export function scoreCreators(creators: Creator[]): ScoredCreator[] {
  const metricsById = new Map<string, Partial<Record<MetricKey, MetricScore>>>();
  const put = (group: Creator[], def: MetricDef, groupLabel: string) => {
    group = group.filter((c) => def.value(c) !== null && Number.isFinite(def.value(c)));
    const results = percentileRanks(group.map((c) => def.value(c) as number), def.higherIsBetter);
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
  return creators.map((c) => ({ ...c, metrics: metricsById.get(c.id) ?? {} }));
}

/** 매칭 점수 = Σ 항목 점수 × 비중 ÷ 100 (반올림은 표시할 때만) */
export function matchScore(c: ScoredCreator, weights: Weights): number {
  if (!hasMatchingData(c) || METRIC_KEYS.some((k) => !c.metrics[k])) {
    throw new Error('평점·단가 등 필요한 정보가 없어 매칭 점수를 계산할 수 없습니다.');
  }
  return METRIC_KEYS.reduce((sum, k) => sum + (c.metrics[k]!.score * weights[k]) / 100, 0);
}

/** 동점 정렬: 매칭 점수 desc → 참여율 desc → creator_id asc (설계 §5.5) */
export function compareByMatch(a: RankedCreator, b: RankedCreator): number {
  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
  if (b.engagementRate !== a.engagementRate) return b.engagementRate - a.engagementRate;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function rankCreators(list: ScoredCreator[], weights: Weights): RankedCreator[] {
  if (!weightsSumIs100(weights)) throw new Error('비중 합이 100이어야 합니다.');
  return list.filter(hasMatchingData)
    .filter((c) => METRIC_KEYS.every((k) => c.metrics[k]))
    .map((c) => ({ ...c, metrics: c.metrics as Record<MetricKey, MetricScore>, matchScore: matchScore(c, weights) }))
    .sort(compareByMatch);
}

/** 참고값을 채워 넣지 않고 실제 기록이 있는 후보만 종합 비교한다. */
export function hasMatchingData<T extends Creator>(c: T): c is T & { rate: number; rating: number; costPerView: number } {
  return c.hasHistory && c.rate !== null && c.rating !== null && c.costPerView !== null
    && Number.isFinite(c.rate) && Number.isFinite(c.rating) && Number.isFinite(c.costPerView);
}
