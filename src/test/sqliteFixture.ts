import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import initSqlJs, { type SqlJsStatic } from 'sql.js';

const require = createRequire(import.meta.url);
export const databaseBytes = new Uint8Array(readFileSync(require.resolve('../../data/creators.sqlite')));
let runtime: Promise<SqlJsStatic> | undefined;

// WASM만 디스크에서 제공한다. SQLite 엔진과 DB 조회는 실제로 실행한다.
export function getTestSqliteRuntime() {
  return runtime ??= initSqlJs({ wasmBinary: Uint8Array.from(readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'))).buffer });
}
