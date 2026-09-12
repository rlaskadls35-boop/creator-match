import { METRIC_KEYS } from './types';
import type { MetricKey, MetricScore, ScoredCreator } from './types';
import { METRIC_LABEL } from './weights';
import { displayTopPercent } from './percentile';
import { formatCompact, formatCostPerView, formatPercent, formatRating } from './format';

/** 항목 점수가 이 값 미만이면 유의점 */
export const CAUTION_THRESHOLD = 25;

export interface Chip { key: MetricKey; text: string }
export interface Caution { key: MetricKey; text: string }
export interface MetricBar { key: MetricKey; label: string; score: number; rankText: string }

/** 이력 없는 사람에게는 뽑지 않는 항목 (예상 평점·건수 0) */
const availableKeys = (c: ScoredCreator) => METRIC_KEYS.filter((k) => c.metrics[k] !== undefined);

function chipText(c: ScoredCreator, key: MetricKey): string {
  const top = displayTopPercent(c.metrics[key]!.topPercent);
  switch (key) {
    case 'engagement': return `참여율 상위 ${top}% (${c.tier} 기준)`;
    case 'views': return `평균 조회수 상위 ${top}% (${c.tier} 기준)`;
    case 'rating': return `광고주 평점 ${(c.rating === null ? '없음' : formatRating(c.rating))}, 전체 상위 ${top}%`;
    case 'costPerView': return `조회 1회당 ${(c.costPerView === null ? '확인 필요' : formatCostPerView(c.costPerView))}, ${c.tier} 상위 ${top}%`;
  }
}

/** 강점 칩: 항목 점수 높은 순 최대 limit개 */
export function strengthChips(c: ScoredCreator, limit = 3): Chip[] {
  const keys = availableKeys(c);
  return keys
    .map((key) => ({ key, score: c.metrics[key]!.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ key }) => ({ key, text: chipText(c, key) }));
}

const SUBJECT: Record<MetricKey, string> = {
  engagement: '참여율은',
  views: '평균 조회수는',
  rating: '광고주 평점은',
  costPerView: '조회 1회당 평균 비용은',
};

const RAW_VALUE: Record<MetricKey, (c: ScoredCreator) => string> = {
  engagement: (c) => formatPercent(c.engagementRate),
  views: (c) => formatCompact(c.avgViewCount),
  rating: (c) => (c.rating === null ? '없음' : formatRating(c.rating)),
  costPerView: (c) => (c.costPerView === null ? '확인 필요' : formatCostPerView(c.costPerView)),
};

/** 유의점: 항목 점수 25 미만인 항목마다 한 줄. 이력 없음은 건수 제외 */
export function cautions(c: ScoredCreator): Caution[] {
  const keys = availableKeys(c);
  return keys
    .filter((k) => c.metrics[k]!.score < CAUTION_THRESHOLD)
    .map((k) => ({ key: k, text: `${SUBJECT[k]} ${c.metrics[k]!.groupLabel} 중 하위권입니다 (${RAW_VALUE[k](c)})` }));
}

/** "{집단} {인원}명 중 {등수}등". 동점이 있으면 공동 등수임을 밝힌다 (L23) */
export function rankText(m: MetricScore): string {
  return `${m.groupLabel} ${m.groupSize}명 중 ${m.tied ? '공동 ' : ''}${m.rank}등`;
}

/** 확인 가능한 항목 점수 막대. 비중은 넣지 않는다 (설계 D10, D25) */
export function metricBars(c: ScoredCreator): MetricBar[] {
  return availableKeys(c).map((k) => {
    const m = c.metrics[k]!;
    return { key: k, label: METRIC_LABEL[k], score: Math.round(m.score), rankText: rankText(m) };
  });
}
