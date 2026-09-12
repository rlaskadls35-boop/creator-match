import { parse } from "csv-parse/sync";
import { categories } from "./campaign-options";
import type { CreatorRecord } from "./creator-types";

export const creatorColumns: (keyof CreatorRecord)[] = [
  "creator_id", "creator_name", "category", "platform", "followers", "avg_view_count",
  "engagement_rate", "total_campaign_count", "total_campaign_budget_krw",
  "avg_campaign_budget_krw", "advertiser_rating",
];

export function parseCreators(csv: string): CreatorRecord[] {
  const records: Record<string, string>[] = parse(csv, {
    bom: true,
    columns: (columns: string[]) => {
      if (columns.length !== creatorColumns.length || new Set(columns).size !== columns.length) {
        throw new Error("CSV 컬럼은 중복 없이 11개여야 합니다.");
      }
      for (const column of creatorColumns) {
        if (!columns.includes(column)) throw new Error(`CSV에 필수 컬럼이 없습니다: ${column}`);
      }
      return columns;
    },
    skip_empty_lines: true,
    trim: true,
  });
  if (records.length === 0) throw new Error("CSV에 크리에이터 데이터가 없습니다.");
  const ids = new Set<string>();

  return records.map((row, index) => {
    const fail = (message: string): never => { throw new Error(`CSV ${index + 2}행: ${message}`); };
    if (!row.creator_id || !row.creator_name) fail("ID와 채널명은 필수입니다.");
    if (ids.has(row.creator_id)) fail(`중복된 ID입니다: ${row.creator_id}`);
    ids.add(row.creator_id);
    if (!categories.includes(row.category)) fail("카테고리를 확인해 주세요.");
    const platform = row.platform;
    if (platform !== "유튜브" && platform !== "인스타그램") return fail("플랫폼을 확인해 주세요.");

    function number(column: string, integer = true, max = Number.MAX_SAFE_INTEGER): number | null {
      const value = row[column];
      if (value === "") return null;
      const format = integer ? /^\d+$/ : /^\d+(?:\.\d+)?$/;
      if (!format.test(value)) return fail(`${column}은 0 이상의 ${integer ? "정수" : "숫자"}여야 합니다.`);
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed > max || (integer && !Number.isSafeInteger(parsed))) {
        return fail(`${column}의 숫자 형식 또는 허용 범위를 확인해 주세요.`);
      }
      return parsed;
    }

    const record: CreatorRecord = {
      creator_id: row.creator_id,
      creator_name: row.creator_name,
      category: row.category,
      platform,
      followers: number("followers"),
      avg_view_count: number("avg_view_count"),
      engagement_rate: number("engagement_rate", false, 100),
      total_campaign_count: number("total_campaign_count"),
      total_campaign_budget_krw: number("total_campaign_budget_krw"),
      avg_campaign_budget_krw: number("avg_campaign_budget_krw"),
      advertiser_rating: number("advertiser_rating", false, 5),
    };
    if (record.total_campaign_count === 0 && record.advertiser_rating !== null) {
      fail("캠페인 이력이 없는 데이터에 광고주 평점이 있습니다.");
    }
    return record;
  });
}
