import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let runtime: Promise<SqlJsStatic> | undefined;

export function getSqliteRuntime(): Promise<SqlJsStatic> {
  runtime ??= initSqlJs({ locateFile: () => wasmUrl }).catch((error: unknown) => {
    runtime = undefined;
    throw error;
  });
  return runtime;
}
