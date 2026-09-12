import type { Category, Creator, Platform, RankedCreator, Tier } from './types';
import { compareByMatch } from './scoring';

// ───────────── 1단계 필터 (설계 §5.1) ─────────────

export interface SearchInput {
  budget: number;
  categories: Category[];
  tier: Tier;
}

export function filterCandidates<T extends Creator>(all: T[], input: SearchInput): T[] {
  return all.filter(
    (c) => input.categories.includes(c.category) && c.tier === input.tier && c.rate <= input.budget,
  );
}

// ───────────── 정렬 (설계 §5.10) ─────────────

export type SortKey = 'match' | 'engagement' | 'views' | 'rating' | 'campaigns' | 'rate';
export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: 'match', direction: 'desc' };

export const SORT_DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  match: 'desc', engagement: 'desc', views: 'desc', rating: 'desc', campaigns: 'desc', rate: 'asc',
};

export const SORT_LABEL: Record<SortKey, string> = {
  match: '매칭 점수', engagement: '참여율', views: '평균 조회수', rating: '광고주 평점', campaigns: '캠페인 건수', rate: '단가',
};

const SORT_VALUE: Record<SortKey, (c: RankedCreator) => number> = {
  match: (c) => c.matchScore,
  engagement: (c) => c.engagementRate,
  views: (c) => c.avgViewCount,
  rating: (c) => c.rating,
  campaigns: (c) => c.totalCampaignCount,
  rate: (c) => c.rate,
};

/** 순서만 바꾼다. 매칭 점수는 그대로. 평점순에서는 이력 없음(예상 평점)이 방향과 무관하게 맨 아래 */
export function sortCandidates(list: RankedCreator[], sort: SortState): RankedCreator[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  const value = SORT_VALUE[sort.key];
  return [...list].sort((a, b) => {
    if (sort.key === 'rating' && a.hasHistory !== b.hasHistory) return a.hasHistory ? -1 : 1;
    const d = value(a) - value(b);
    if (d !== 0) return d * sign;
    return compareByMatch(a, b);
  });
}

// ───────────── 결과 화면 필터 (설계 §5.1 마지막 단락, §5.10) ─────────────

export interface ResultFilters {
  platform: 'all' | Platform;
  historyOnly: boolean;
}

export const DEFAULT_FILTERS: ResultFilters = { platform: 'all', historyOnly: false };

export function applyResultFilters<T extends Creator>(list: T[], f: ResultFilters): T[] {
  return list.filter(
    (c) => (f.platform === 'all' || c.platform === f.platform) && (!f.historyOnly || c.hasHistory),
  );
}
