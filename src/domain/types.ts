export const CATEGORIES = ['뷰티', '식품', '패션', '피트니스', '여행', '아웃도어', '라이프스타일', '테크', '게임', '교육'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLATFORMS = ['유튜브', '인스타그램'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TIERS = ['나노', '마이크로', '매크로'] as const;
export type Tier = (typeof TIERS)[number];

/** 점수 항목 5개. 순서는 화면 표시 순서(설계 §5.3 표) */
export const METRIC_KEYS = ['engagement', 'views', 'rating', 'costPerView', 'campaigns'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface Creator {
  id: string;
  name: string;
  category: Category;
  platform: Platform;
  followers: number;
  avgViewCount: number;
  engagementRate: number;
  totalCampaignCount: number;
  totalCampaignBudgetKrw: number;
  avgCampaignBudgetKrw: number;
  advertiserRating: number | null;
  // 파생 필드 (설계 §3.4)
  tier: Tier;
  hasHistory: boolean;
  rate: number;
  rateIsEstimated: boolean;
  rating: number;
  ratingIsEstimated: boolean;
  costPerView: number;
}

export interface MetricScore {
  key: MetricKey;
  /** 항목 점수 0~100, 소수 첫째 자리까지 */
  score: number;
  /** 상위 % (반올림 전 원값) */
  topPercent: number;
  /** 집단 안 등수, 1부터 */
  rank: number;
  groupSize: number;
  /** '나노' | '마이크로' | '매크로' | '전체' */
  groupLabel: string;
}

export interface ScoredCreator extends Creator {
  metrics: Record<MetricKey, MetricScore>;
}

export interface RankedCreator extends ScoredCreator {
  /** 매칭 점수 0~100 (반올림 전) */
  matchScore: number;
}

export type Weights = Record<MetricKey, number>;

export interface DatasetStats {
  total: number;
  noHistoryCount: number;
  ratedCount: number;
  ratingAverage: number;
  medianRateByTier: Record<Tier, number>;
  skippedRows: number;
}

export interface Dataset {
  creators: Creator[];
  stats: DatasetStats;
}
