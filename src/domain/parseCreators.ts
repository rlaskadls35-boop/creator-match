import Papa from 'papaparse';
import { CATEGORIES, PLATFORMS, TIERS } from './types';
import type { Category, Creator, Dataset, Platform, Tier } from './types';
import { tierOf } from './tiers';

export const EXPECTED_HEADERS = [
  'creator_id', 'creator_name', 'category', 'platform', 'followers', 'avg_view_count',
  'engagement_rate', 'total_campaign_count', 'total_campaign_budget_krw', 'avg_campaign_budget_krw', 'advertiser_rating',
] as const;

export class CsvHeaderError extends Error {
  constructor(message = 'CSV 컬럼 구성이 예상과 다릅니다.') {
    super(message);
    this.name = 'CsvHeaderError';
  }
}

type RawRow = Record<string, string | undefined>;

interface BaseRow {
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

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 비어 있거나 숫자가 아니거나 음수면 null */
function parseNonNegative(value: string | undefined): number | null {
  if (value === undefined) return null;
  const t = value.trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toBaseRow(r: RawRow): BaseRow | null {
  const id = r.creator_id?.trim();
  const name = r.creator_name?.trim();
  const category = r.category?.trim();
  const platform = r.platform?.trim();
  if (!id || !name || !category || !platform) return null;
  if (!(CATEGORIES as readonly string[]).includes(category)) return null;
  if (!(PLATFORMS as readonly string[]).includes(platform)) return null;

  const followers = parseNonNegative(r.followers);
  const avgViewCount = parseNonNegative(r.avg_view_count);
  const engagementRate = parseNonNegative(r.engagement_rate);
  const totalCampaignCount = parseNonNegative(r.total_campaign_count);
  const totalCampaignBudgetKrw = parseNonNegative(r.total_campaign_budget_krw);
  const avgCampaignBudgetKrw = parseNonNegative(r.avg_campaign_budget_krw);
  if (
    followers === null || avgViewCount === null || engagementRate === null ||
    totalCampaignCount === null || totalCampaignBudgetKrw === null || avgCampaignBudgetKrw === null
  ) return null;

  const ratingText = (r.advertiser_rating ?? '').trim();
  let advertiserRating: number | null = null;
  if (ratingText !== '') {
    const n = parseNonNegative(ratingText);
    if (n === null || n > 5) return null;
    advertiserRating = n;
  }

  return {
    id, name, category: category as Category, platform: platform as Platform,
    followers, avgViewCount, engagementRate, totalCampaignCount, totalCampaignBudgetKrw, avgCampaignBudgetKrw, advertiserRating,
  };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function parseCreators(csvText: string): Dataset {
  const parsed = Papa.parse<RawRow>(stripBom(csvText), { header: true, skipEmptyLines: true });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim());
  const expected = EXPECTED_HEADERS as readonly string[];
  if (headers.length !== expected.length || expected.some((h, i) => headers[i] !== h)) {
    throw new CsvHeaderError();
  }

  const base: BaseRow[] = [];
  let skipped = 0;
  for (const raw of parsed.data) {
    const row = toBaseRow(raw);
    if (row) base.push(row);
    else skipped += 1;
  }

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
      skippedRows: skipped,
    },
  };
}
