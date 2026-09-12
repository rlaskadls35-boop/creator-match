import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { Creator } from "./creator-types";

const requiredColumns = [
  "creator_id", "creator_name", "category", "platform", "followers", "avg_view_count",
  "engagement_rate", "total_campaign_count", "avg_campaign_budget_krw", "advertiser_rating",
];

function readNumber(value: string, max = Number.MAX_SAFE_INTEGER): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
}

export function parseCreators(csv: string): Creator[] {
  const records: Record<string, string>[] = parse(csv, {
    bom: true,
    columns: (columns: string[]) => {
      for (const column of requiredColumns) {
        if (!columns.includes(column)) throw new Error(`CSV에 필수 컬럼이 없습니다: ${column}`);
      }
      return columns;
    },
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((row, index) => {
    if (!row.creator_id || !row.creator_name || !row.category) {
      throw new Error(`CSV ${index + 2}행의 크리에이터 기본 정보가 누락됐습니다.`);
    }
    if (row.platform !== "유튜브" && row.platform !== "인스타그램") {
      throw new Error(`CSV ${index + 2}행의 플랫폼을 확인해 주세요.`);
    }
    const campaignCount = readNumber(row.total_campaign_count);
    const averageBudget = readNumber(row.avg_campaign_budget_krw);
    const hasCampaignHistory = campaignCount !== null && campaignCount > 0;

    return {
      id: row.creator_id,
      name: row.creator_name,
      category: row.category,
      platform: row.platform,
      followers: readNumber(row.followers),
      avgViewCount: readNumber(row.avg_view_count),
      engagementRate: readNumber(row.engagement_rate, 100),
      totalCampaignCount: campaignCount,
      avgCampaignBudgetKrw: hasCampaignHistory && averageBudget !== null && averageBudget > 0 ? averageBudget : null,
      advertiserRating: hasCampaignHistory ? readNumber(row.advertiser_rating, 5) : null,
    };
  });
}

export async function getCreators(): Promise<Creator[]> {
  const csv = await readFile(path.join(process.cwd(), "dummy_creators.csv"), "utf8");
  return parseCreators(csv);
}
