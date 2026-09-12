import { TIERS } from './types';
import type { Category, Creator, Dataset, Platform, Tier } from './types';
import { tierOf } from './tiers';

export interface BaseRow {
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
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** CSV와 SQLite가 같은 파생값·통계 규칙을 사용한다. */
export function createDataset(base: BaseRow[], skippedRows = 0): Dataset {
  // 통계는 상수로 박지 않고 데이터에서 계산한다 (설계 §3.4)
  const withHistory = base.filter((b) => b.totalCampaignCount > 0);
  const rated = base.filter((b) => b.advertiserRating !== null);
  const ratingAverage = rated.length
    ? Math.round((rated.reduce((s, b) => s + (b.advertiserRating as number), 0) / rated.length) * 100) / 100
    : 0;
  const medianRateByTier = {} as Record<Tier, number>;
  for (const t of TIERS) {
    const rates = withHistory.filter((b) => tierOf(b.followers) === t).map((b) => b.avgCampaignBudgetKrw).filter((rate) => rate > 0);
    medianRateByTier[t] = rates.length ? median(rates) : 0;
  }

  const creators: Creator[] = base.map((b) => {
    const tier = tierOf(b.followers);
    const hasHistory = b.totalCampaignCount > 0;
    const rate = hasHistory && b.avgCampaignBudgetKrw > 0 ? b.avgCampaignBudgetKrw : null;
    const rating = hasHistory ? b.advertiserRating : null;
    return {
      ...b,
      tier,
      hasHistory,
      rate,
      rating,
      costPerView: rate !== null && b.avgViewCount > 0 ? rate / b.avgViewCount : null,
    };
  });

  return {
    creators,
    stats: {
      total: creators.length,
      noHistoryCount: creators.filter((c) => !c.hasHistory).length,
      ratedCount: rated.length,
      ratingAverage,
      medianRateByTier,
      skippedRows,
    },
  };
}
