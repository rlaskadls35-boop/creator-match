import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import initSqlJs from 'sql.js';
import { parseCreators } from '../src/domain/parseCreators';
import { buildCreatorDatabase, readCreatorDatabase } from '../src/data/creatorDatabase';

// 제공받은 원본의 바이트 지문. CSV 변경을 정상적인 DB 갱신으로 오인하지 않게 한다.
const ORIGINAL_SHA256 = '6f139b1a8cac4a7aa0d8034bde2df16ae7c06896ee820eec16ddafbcf2738b8c';
const source = new URL('../data/dummy_creators.csv', import.meta.url);
const original = new URL('../dummy_creators.csv', import.meta.url);
const output = new URL('../data/creators.sqlite', import.meta.url);
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const [csv, rootCsv] = await Promise.all([readFile(source), readFile(original)]);
if (sha256(csv) !== ORIGINAL_SHA256 || sha256(rootCsv) !== ORIGINAL_SHA256) {
  throw new Error('CSV 원본이 변경되었습니다. 원본을 덮어쓰거나 DB를 갱신하지 않습니다.');
}
const dataset = parseCreators(csv.toString('utf8'));
if (dataset.stats.skippedRows > 0 || dataset.creators.length !== 200) {
  throw new Error('원본 200명을 모두 가져오지 못했습니다. DB 생성을 중단합니다.');
}
const SQL = await initSqlJs();
const bytes = buildCreatorDatabase(SQL, dataset, ORIGINAL_SHA256);
const verificationDb = new SQL.Database(bytes);
try {
  if (verificationDb.exec('PRAGMA integrity_check')[0]?.values[0]?.[0] !== 'ok') {
    throw new Error('SQLite 무결성 검증에 실패했습니다.');
  }
  if (JSON.stringify(readCreatorDatabase(verificationDb)) !== JSON.stringify(dataset)) {
    throw new Error('CSV와 SQLite 데이터가 일치하지 않습니다.');
  }
} finally {
  verificationDb.close();
}
// 실행 중에도 CSV는 읽기만 한다. 동일한 DB는 다시 쓰지 않는다.
const previous = await readFile(output).catch((error: NodeJS.ErrnoException) => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (!previous?.equals(bytes)) await writeFile(output, bytes);
console.log(`SQLite 준비 완료: ${dataset.creators.length}명 · 평점 NULL ${dataset.stats.noHistoryCount}명 · CSV 원본 SHA-256 일치`);
