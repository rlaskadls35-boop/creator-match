import databaseUrl from '../../data/creators.sqlite?url';
import { readCreatorDatabase } from '../data/creatorDatabase';
import { getSqliteRuntime } from '../data/sqliteRuntime';
import { scoreCreators } from '../domain/scoring';
import type { DatasetStats, ScoredCreator } from '../domain/types';

export type LoadedData =
  | { ok: true; creators: ScoredCreator[]; stats: DatasetStats }
  | { ok: false; message: string };

/** 실제 SQLite 파일을 읽고 항목 점수까지 계산한다. CSV는 런타임에 읽지 않는다. */
export async function loadDataset(bytes?: Uint8Array): Promise<LoadedData> {
  try {
    if (!bytes) {
      const response = await fetch(databaseUrl);
      if (!response.ok) throw new Error('데이터 파일을 내려받지 못했습니다.');
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    const SQL = await getSqliteRuntime();
    const db = new SQL.Database(bytes);
    try {
      const ds = readCreatorDatabase(db);
      return { ok: true, creators: scoreCreators(ds.creators), stats: ds.stats };
    } finally {
      db.close();
    }
  } catch {
    return { ok: false, message: '크리에이터 데이터를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.' };
  }
}
