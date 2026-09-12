import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators, CsvHeaderError } from '../domain/parseCreators';
import { scoreCreators } from '../domain/scoring';
import type { DatasetStats, ScoredCreator } from '../domain/types';

export type LoadedData =
  | { ok: true; creators: ScoredCreator[]; stats: DatasetStats }
  | { ok: false; message: string };

/** 빌드 시 문자열로 포함된 원본 CSV를 §3.3 규칙으로 정제하고 항목 점수까지 계산한다 */
export function loadDataset(text: string = csvText): LoadedData {
  try {
    const ds = parseCreators(text);
    return { ok: true, creators: scoreCreators(ds.creators), stats: ds.stats };
  } catch (e) {
    const detail = e instanceof CsvHeaderError ? e.message : '알 수 없는 오류입니다.';
    return { ok: false, message: `데이터 파일을 읽을 수 없습니다. ${detail}` };
  }
}
