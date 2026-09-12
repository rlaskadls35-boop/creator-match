import type { Database, SqlJsStatic } from 'sql.js';
import { createDataset, type BaseRow } from '../domain/creatorDataset';
import type { Dataset } from '../domain/types';

const SCHEMA_VERSION = 1;

/** 원본의 11개 필드만 저장한다. 추천 점수·규모·추정값은 저장하지 않는다. */
export function buildCreatorDatabase(SQL: SqlJsStatic, dataset: Dataset, sourceSha256: string): Uint8Array {
  const db = new SQL.Database();
  try {
    db.run(`
      PRAGMA user_version = ${SCHEMA_VERSION};
      BEGIN TRANSACTION;
      CREATE TABLE creators (
        creator_id TEXT PRIMARY KEY NOT NULL,
        creator_name TEXT NOT NULL,
        category TEXT NOT NULL,
        platform TEXT NOT NULL,
        followers INTEGER NOT NULL CHECK (followers >= 0),
        avg_view_count INTEGER NOT NULL CHECK (avg_view_count >= 0),
        engagement_rate REAL NOT NULL CHECK (engagement_rate >= 0),
        total_campaign_count INTEGER NOT NULL CHECK (total_campaign_count >= 0),
        total_campaign_budget_krw INTEGER NOT NULL CHECK (total_campaign_budget_krw >= 0),
        avg_campaign_budget_krw INTEGER NOT NULL CHECK (avg_campaign_budget_krw >= 0),
        advertiser_rating REAL CHECK (advertiser_rating BETWEEN 0 AND 5)
      ) STRICT;
      CREATE TABLE dataset_metadata (
        source_sha256 TEXT NOT NULL,
        row_count INTEGER NOT NULL,
        skipped_rows INTEGER NOT NULL
      ) STRICT;
    `);
    const insert = db.prepare('INSERT INTO creators VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    try {
      for (const c of dataset.creators) {
        insert.run([
          c.id, c.name, c.category, c.platform, c.followers, c.avgViewCount,
          c.engagementRate, c.totalCampaignCount, c.totalCampaignBudgetKrw,
          c.avgCampaignBudgetKrw, c.advertiserRating,
        ]);
      }
    } finally {
      insert.free();
    }
    db.run('INSERT INTO dataset_metadata VALUES (?, ?, ?)', [sourceSha256, dataset.creators.length, dataset.stats.skippedRows]);
    db.run('COMMIT');
    return db.export();
  } finally {
    db.close();
  }
}

/** SQL 조회 후 기존 규칙으로 파생값을 계산한다. 연결의 수명은 호출자가 관리한다. */
export function readCreatorDatabase(db: Database): Dataset {
  db.run('PRAGMA query_only = ON');
  if (db.exec('PRAGMA user_version')[0]?.values[0]?.[0] !== SCHEMA_VERSION) {
    throw new Error('지원하지 않는 데이터베이스 버전입니다.');
  }
  const metadata = db.exec('SELECT row_count, skipped_rows FROM dataset_metadata')[0]?.values;
  if (metadata?.length !== 1) throw new Error('데이터베이스 정보가 올바르지 않습니다.');
  const [rowCount, skippedRows] = metadata[0];
  if (typeof rowCount !== 'number' || rowCount <= 0 || typeof skippedRows !== 'number' || skippedRows < 0) {
    throw new Error('데이터베이스의 인원 정보가 올바르지 않습니다.');
  }
  const statement = db.prepare(`
    SELECT creator_id AS id, creator_name AS name, category, platform, followers,
      avg_view_count AS avgViewCount, engagement_rate AS engagementRate,
      total_campaign_count AS totalCampaignCount,
      total_campaign_budget_krw AS totalCampaignBudgetKrw,
      avg_campaign_budget_krw AS avgCampaignBudgetKrw,
      advertiser_rating AS advertiserRating
    FROM creators ORDER BY rowid
  `);
  const rows: BaseRow[] = [];
  try {
    while (statement.step()) rows.push(statement.getAsObject() as unknown as BaseRow);
  } finally {
    statement.free();
  }
  if (rows.length !== rowCount) throw new Error('데이터베이스의 인원이 일치하지 않습니다.');
  return createDataset(rows, skippedRows);
}
