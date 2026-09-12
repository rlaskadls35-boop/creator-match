import { CATEGORIES, TIERS } from './types';
import type { Category, Creator, Platform, RankedCreator, Tier } from './types';
import { compareByMatch, hasMatchingData } from './scoring';
import { formatWon } from './format';

// ───────────── 1단계 필터 (설계 §5.1) ─────────────

export interface SearchInput {
  platform: 'all' | Platform;
  budget: number;
  categories: Category[];
  tier: Tier;
}

function matchesPlatform(c: Creator, platform: SearchInput['platform']): boolean {
  return platform === 'all' || c.platform === platform;
}

export function filterCandidates<T extends Creator>(all: T[], input: SearchInput): T[] {
  return all.filter(
    (c) => hasMatchingData(c) && matchesPlatform(c, input.platform) && input.categories.includes(c.category) && c.tier === input.tier && c.rate <= input.budget,
  );
}

// ───────────── 정렬 (설계 §5.10) ─────────────

export type SortKey = 'match' | 'followers' | 'views' | 'engagement' | 'campaigns' | 'rating' | 'rate';
export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: 'match', direction: 'desc' };

export const SORT_DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  match: 'desc', followers: 'desc', views: 'desc', engagement: 'desc', campaigns: 'desc', rating: 'desc', rate: 'asc',
};

export const SORT_LABEL: Record<SortKey, string> = {
  match: '매칭 점수', followers: '팔로워 수', views: '평균 조회수', engagement: '참여율',
  campaigns: '누적 캠페인', rating: '광고주 평점', rate: '1건 평균 단가',
};

const SORT_VALUE: Record<SortKey, (c: RankedCreator) => number> = {
  match: (c) => c.matchScore,
  followers: (c) => c.followers,
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
  historyOnly: boolean;
}

export const DEFAULT_FILTERS: ResultFilters = { historyOnly: false };

export function applyResultFilters<T extends Creator>(list: T[], f: ResultFilters): T[] {
  return list.filter((c) => !f.historyOnly || c.hasHistory);
}

// ───────────── 후보가 없거나 적을 때 (설계 §5.7) ─────────────

/** 후보가 이 값 미만이면 표 아래에 완화 버튼을 작게 붙인다 */
export const FEW_RESULTS_THRESHOLD = 3;

export interface Relaxation {
  id: string;
  kind: 'budget' | 'platform' | 'tier' | 'category';
  /** 버튼 앞부분 문구. 화면에서 "{label} → {count}명"으로 그린다 */
  label: string;
  count: number;
  enabled: boolean;
  nextInput: SearchInput;
  /** 비활성일 때 곁에 적는 말: "최저 단가 54만 원" 또는 "해당 크리에이터 없음" */
  note: string | null;
}

export interface NearCandidate {
  creator: RankedCreator;
  /** "이렇게 바꾸면 섭외 가능" 열 문구 */
  change: string;
}

function minRate(list: { rate: number }[]): number | null {
  return list.length ? Math.min(...list.map((c) => c.rate)) : null;
}

/** 조건 완화 버튼. 0명일 때와 1~2명일 때 공용 */
export function buildRelaxations(all: RankedCreator[], input: SearchInput): Relaxation[] {
  const out: Relaxation[] = [];

  // 예산 올리기: 카테고리·규모는 맞는데 예산을 넘는 사람 중 최저 단가로
  const A = all.filter((c) => matchesPlatform(c, input.platform) && input.categories.includes(c.category) && c.tier === input.tier);
  const proposal = minRate(A.filter((c) => c.rate > input.budget));
  if (proposal !== null) {
    const count = A.filter((c) => c.rate <= proposal).length;
    out.push({
      id: 'budget', kind: 'budget',
      label: `예산을 ${formatWon(proposal)}으로 올리면`,
      count, enabled: count > 0,
      nextInput: { ...input, budget: proposal }, note: null,
    });
  }

  // 플랫폼 넓히기: 나머지 조건은 유지하고 전체 플랫폼으로 검색
  if (input.platform !== 'all') {
    const count = all.filter(
      (c) => input.categories.includes(c.category) && c.tier === input.tier && c.rate <= input.budget,
    ).length;
    out.push({
      id: 'platform', kind: 'platform',
      label: '플랫폼을 전체로 넓히면',
      count, enabled: count > 0,
      nextInput: { ...input, platform: 'all' },
      note: count > 0 ? null : '다른 플랫폼에도 조건에 맞는 크리에이터 없음',
    });
  }

  // 규모 바꾸기: 다른 두 tier 각각
  for (const t of TIERS) {
    if (t === input.tier) continue;
    const pool = all.filter((c) => matchesPlatform(c, input.platform) && input.categories.includes(c.category) && c.tier === t);
    const count = pool.filter((c) => c.rate <= input.budget).length;
    const min = minRate(pool);
    out.push({
      id: `tier-${t}`, kind: 'tier',
      label: `규모를 ${t}로 바꾸면`,
      count, enabled: count > 0,
      nextInput: { ...input, tier: t },
      note: count > 0 ? null : min === null ? '해당 크리에이터 없음' : `최저 단가 ${formatWon(min)}`,
    });
  }

  // 카테고리 넓히기: 같은 규모 전체
  const pool = all.filter((c) => matchesPlatform(c, input.platform) && c.tier === input.tier);
  const count = pool.filter((c) => c.rate <= input.budget).length;
  const min = minRate(pool);
  out.push({
    id: 'category', kind: 'category',
    label: `카테고리를 넓히면 (${input.tier} 전체)`,
    count, enabled: count > 0,
    nextInput: { ...input, categories: [...CATEGORIES] },
    note: count > 0 ? null : min === null ? '해당 크리에이터 없음' : `최저 단가 ${formatWon(min)}`,
  });

  return out;
}

/** 검색 조건 중 정확히 하나만 어긋나는 사람들 → 매칭 점수 상위 limit명 */
export function nearCandidates(all: RankedCreator[], input: SearchInput, limit = 3): NearCandidate[] {
  const out: NearCandidate[] = [];
  for (const c of all) {
    const categoryOk = input.categories.includes(c.category);
    const tierOk = c.tier === input.tier;
    const budgetOk = c.rate <= input.budget;
    const platformOk = matchesPlatform(c, input.platform);
    const missed = [platformOk, categoryOk, tierOk, budgetOk].filter((ok) => !ok).length;
    if (missed !== 1) continue;
    const change = !budgetOk
      ? `예산을 ${formatWon(c.rate)} 이상으로`
      : !tierOk
        ? `규모를 ${c.tier}로`
        : !categoryOk
          ? `카테고리에 ${c.category} 추가`
          : `플랫폼을 ${c.platform}${c.platform === '유튜브' ? '로' : '으로'}`;
    out.push({ creator: c, change });
  }
  return out.sort((a, b) => compareByMatch(a.creator, b.creator)).slice(0, limit);
}

/** 단가가 없어 예산 통과를 판단할 수 없는 신규 후보. 카테고리·규모만 적용한다. */
export function filterNewCandidates<T extends Creator>(all: T[], input: SearchInput): T[] {
  return all.filter((c) => !c.hasHistory && matchesPlatform(c, input.platform) && input.categories.includes(c.category) && c.tier === input.tier);
}

export type NewCandidateSortKey = 'engagement' | 'views';
export function sortNewCandidates<T extends Creator>(all: T[], key: NewCandidateSortKey): T[] {
  return [...all].sort((a, b) => {
    const primary = key === 'views' ? b.avgViewCount - a.avgViewCount : b.engagementRate - a.engagementRate;
    return primary || b.avgViewCount - a.avgViewCount || b.engagementRate - a.engagementRate || a.id.localeCompare(b.id);
  });
}
