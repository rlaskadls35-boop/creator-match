import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals:true를 쓰지 않으므로 렌더 정리는 직접 건다 (한 파일에서 여러 번 render할 때 필요)
afterEach(cleanup);

vi.mock('../data/sqliteRuntime', async () => {
  const { getTestSqliteRuntime } = await import('./sqliteFixture');
  return { getSqliteRuntime: getTestSqliteRuntime };
});
