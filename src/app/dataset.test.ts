import { describe, it, expect } from 'vitest';
import { loadDataset } from './dataset';

describe('loadDataset', () => {
  it('번들된 CSV로 200명을 점수까지 계산해 로드한다', () => {
    const d = loadDataset();
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.creators).toHaveLength(200);
      expect(d.creators[0].metrics.engagement).toBeDefined();
      expect(d.stats.noHistoryCount).toBe(27);
    }
  });
  it('헤더가 다르면 ok=false와 메시지', () => {
    const d = loadDataset('a,b\n1,2\n');
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.message).toContain('데이터 파일을 읽을 수 없습니다');
  });
});
