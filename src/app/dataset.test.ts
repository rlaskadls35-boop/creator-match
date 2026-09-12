import { describe, it, expect, afterEach, vi } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from '../domain/parseCreators';
import { scoreCreators } from '../domain/scoring';
import { databaseBytes, getTestSqliteRuntime } from '../test/sqliteFixture';
import { loadDataset } from './dataset';

afterEach(() => vi.restoreAllMocks());

describe('SQLite 데이터 로드', () => {
  it('200명의 모든 필드·파생값·통계·점수가 CSV를 직접 읽은 결과와 일치한다', async () => {
    const data = await loadDataset(databaseBytes);
    const csv = parseCreators(csvText);
    expect(data).toEqual({ ok: true, creators: scoreCreators(csv.creators), stats: csv.stats });
    if (!data.ok) throw new Error(data.message);
    expect(data.creators).toHaveLength(200);
    expect(data.creators.filter((c) => c.advertiserRating === null)).toHaveLength(27);
  });

  it('기본 경로에서는 CSV 대신 SQLite 파일을 내려받아 조회한다', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(Uint8Array.from(databaseBytes)));
    expect((await loadDataset()).ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('creators.sqlite'));
  });

  it('다운로드 실패는 사용자에게 오류로 표시한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    expect(await loadDataset()).toMatchObject({ ok: false, message: expect.stringContaining('다시 시도') });
  });

  it('손상된 파일을 빈 검색 결과로 취급하지 않는다', async () => {
    expect((await loadDataset(new Uint8Array([1, 2, 3]))).ok).toBe(false);
  });

  it('스키마 버전이 다르거나 일부 인원이 누락되면 로드를 중단한다', async () => {
    const SQL = await getTestSqliteRuntime();
    const db = new SQL.Database(databaseBytes);
    try {
      db.run('PRAGMA user_version = 99');
      expect((await loadDataset(db.export())).ok).toBe(false);
      db.run('PRAGMA user_version = 1; DELETE FROM creators WHERE rowid = 1');
      expect((await loadDataset(db.export())).ok).toBe(false);
    } finally {
      db.close();
    }
  });
});
