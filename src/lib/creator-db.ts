import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { categories, sizes } from "./campaign-options";
import { creatorColumns, parseCreators } from "./creator-data";
import { validateCampaignFilters } from "./creator-filter";
import type { Creator, CreatorResultsData } from "./creator-types";

export const creatorDatabasePath = path.join(process.cwd(), "data", "creator-match.sqlite");

export function createCreatorTable(db: DatabaseSync) {
  db.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS creators (
      creator_id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(creator_id)) > 0),
      creator_name TEXT NOT NULL CHECK (length(trim(creator_name)) > 0),
      category TEXT NOT NULL CHECK (category IN (${categories.map((category) => `'${category}'`).join(",")})),
      platform TEXT NOT NULL CHECK (platform IN ('유튜브', '인스타그램')),
      followers INTEGER CHECK (followers BETWEEN 0 AND 9007199254740991),
      avg_view_count INTEGER CHECK (avg_view_count BETWEEN 0 AND 9007199254740991),
      engagement_rate REAL CHECK (engagement_rate BETWEEN 0 AND 100),
      total_campaign_count INTEGER CHECK (total_campaign_count BETWEEN 0 AND 9007199254740991),
      total_campaign_budget_krw INTEGER CHECK (total_campaign_budget_krw BETWEEN 0 AND 9007199254740991),
      avg_campaign_budget_krw INTEGER CHECK (avg_campaign_budget_krw BETWEEN 0 AND 9007199254740991),
      advertiser_rating REAL CHECK (advertiser_rating BETWEEN 0 AND 5),
      CHECK (total_campaign_count IS NULL OR total_campaign_count != 0 OR advertiser_rating IS NULL)
    ) STRICT;
  `);
}

/** 전체 검증 후 트랜잭션으로 적재한다. 오류가 나면 기존 데이터가 유지된다. */
export function importCreators(db: DatabaseSync, csv: string) {
  const records = parseCreators(csv);
  const statement = db.prepare(`
    INSERT INTO creators (${creatorColumns.join(", ")})
    VALUES (${creatorColumns.map(() => "?").join(", ")})
    ON CONFLICT(creator_id) DO UPDATE SET
      ${creatorColumns.filter((column) => column !== "creator_id").map((column) => `${column} = excluded.${column}`).join(", ")}
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const record of records) statement.run(...creatorColumns.map((column) => record[column]));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return records.length;
}

export function queryCreators(db: DatabaseSync, input: unknown): CreatorResultsData {
  const filters = validateCampaignFilters(input);
  const range = sizes.find((size) => size.id === filters.size)!;
  const conditions = [`category IN (${filters.categories.map(() => "?").join(", ")})`, "followers >= ?"];
  const parameters: SQLInputValue[] = [...filters.categories, range.min];
  if (range.max !== null) { conditions.push("followers < ?"); parameters.push(range.max); }
  if (filters.platform !== "전체") { conditions.push("platform = ?"); parameters.push(filters.platform); }
  const where = conditions.join(" AND ");

  const matches = db.prepare(`
    SELECT creator_id AS id, creator_name AS name, category, platform, followers,
      avg_view_count AS avgViewCount, engagement_rate AS engagementRate,
      total_campaign_count AS totalCampaignCount, avg_campaign_budget_krw AS avgCampaignBudgetKrw,
      advertiser_rating AS advertiserRating
    FROM creators WHERE ${where}
      AND total_campaign_count > 0 AND avg_campaign_budget_krw > 0 AND avg_campaign_budget_krw <= ?
    ORDER BY rowid
  `).all(...parameters, filters.budget) as Creator[];
  const excluded = db.prepare(`
    SELECT count(*) AS count FROM creators WHERE ${where}
      AND (total_campaign_count IS NULL OR total_campaign_count = 0
        OR avg_campaign_budget_krw IS NULL OR avg_campaign_budget_krw = 0)
  `).get(...parameters)!;
  return { matches, unknownBudgetCount: Number(excluded.count) };
}

export function searchCreators(input: unknown): CreatorResultsData {
  const db = new DatabaseSync(creatorDatabasePath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    return queryCreators(db, input);
  } finally {
    db.close();
  }
}
