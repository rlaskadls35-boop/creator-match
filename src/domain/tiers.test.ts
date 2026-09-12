import { describe, it, expect } from 'vitest';
import { tierOf, TIER_INFO } from './tiers';

describe('tierOf (설계 §5.2)', () => {
  it('1만도 나노, 15,000부터 마이크로, 100,000부터 매크로', () => {
    expect(tierOf(9_999)).toBe('나노');
    expect(tierOf(10_000)).toBe('나노');
    expect(tierOf(14_999)).toBe('나노');
    expect(tierOf(15_000)).toBe('마이크로');
    expect(tierOf(99_999)).toBe('마이크로');
    expect(tierOf(100_000)).toBe('매크로');
  });
  it('0과 매우 큰 값도 판정된다', () => {
    expect(tierOf(0)).toBe('나노');
    expect(tierOf(5_000_000)).toBe('매크로');
  });
  it('규모 카드 문구(§4)가 세 구간 모두 있다', () => {
    expect(TIER_INFO['나노'].range).toBe('1.5만 미만');
    expect(TIER_INFO['마이크로'].range).toBe('1.5만 이상~10만 미만');
    expect(TIER_INFO['나노'].rateRange).toBe('단가 21만~196만 원대');
    expect(TIER_INFO['마이크로'].rateRange).toBe('단가 52만~200만 원대');
    expect(TIER_INFO['매크로'].trait).toBe('넓은 도달');
  });
});
