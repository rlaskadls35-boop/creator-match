import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from '../domain/parseCreators';
import { databaseBytes, getTestSqliteRuntime } from '../test/sqliteFixture';
import { buildCreatorDatabase, readCreatorDatabase } from './creatorDatabase';

const originalSha256 = '6f139b1a8cac4a7aa0d8034bde2df16ae7c06896ee820eec16ddafbcf2738b8c';

describe('CSV 보존과 SQLite 저장', () => {
  it('두 CSV의 바이트가 제공받은 원본과 동일하다', () => {
    for (const path of ['dummy_creators.csv', 'data/dummy_creators.csv']) {
      const bytes = readFileSync(path);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(originalSha256);
    }
  });

  it('실제 SQLite에 200명, SQL NULL 평점 27명, 원본 지문을 저장한다', async () => {
    const SQL = await getTestSqliteRuntime();
    const db = new SQL.Database(databaseBytes);
    try {
      expect(db.exec('PRAGMA integrity_check')[0].values).toEqual([['ok']]);
      expect(db.exec('SELECT COUNT(*), COUNT(advertiser_rating) FROM creators')[0].values).toEqual([[200, 173]]);
      expect(db.exec('SELECT COUNT(*) FROM creators WHERE advertiser_rating IS NULL AND total_campaign_count = 0')[0].values).toEqual([[27]]);
      expect(db.exec('SELECT * FROM dataset_metadata')[0].values).toEqual([[originalSha256, 200, 0]]);
    } finally {
      db.close();
    }
  });

  it('재생성이 멱등이고 SQL 조회 결과도 같으며 읽기 연결에서는 쓰기가 거부된다', async () => {
    const SQL = await getTestSqliteRuntime();
    const parsed = parseCreators(csvText);
    const first = buildCreatorDatabase(SQL, parsed, originalSha256);
    const second = buildCreatorDatabase(SQL, parsed, originalSha256);
    expect(first).toEqual(second);
    expect(first).toEqual(databaseBytes);
    const db = new SQL.Database(first);
    try {
      expect(readCreatorDatabase(db)).toEqual(parsed);
      expect(() => db.run('DELETE FROM creators')).toThrow(/readonly/);
    } finally {
      db.close();
    }
  });

  it('중복 ID는 DB 제약으로 거부하고 다음 생성은 정상 작동한다', async () => {
    const SQL = await getTestSqliteRuntime();
    const parsed = parseCreators(csvText);
    expect(() => buildCreatorDatabase(SQL, { ...parsed, creators: [parsed.creators[0], parsed.creators[0]] }, originalSha256)).toThrow(/UNIQUE/);
    expect(buildCreatorDatabase(SQL, parsed, originalSha256)).toEqual(databaseBytes);
  });
});
