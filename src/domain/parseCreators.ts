import Papa from 'papaparse';
import { CATEGORIES, PLATFORMS } from './types';
import type { Category, Dataset, Platform } from './types';
import { createDataset, type BaseRow } from './creatorDataset';

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

  return createDataset(base, skipped);
}
