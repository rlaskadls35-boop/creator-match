import { describe, it, expect } from 'vitest';
import { formatWon, formatCompact, formatPercent, formatRating, formatCostPerView, formatInt } from './format';

describe('format (설계 §4, §6.1)', () => {
  it('formatWon: 만 단위 + 원', () => {
    expect(formatWon(1_500_000)).toBe('150만 원');
    expect(formatWon(500_000)).toBe('50만 원');
    expect(formatWon(3_010_000)).toBe('301만 원');
    expect(formatWon(4_725_000)).toBe('472만 5,000원');
    expect(formatWon(12_345_678)).toBe('1,234만 5,678원');
    expect(formatWon(8_000)).toBe('8,000원');
    expect(formatWon(0)).toBe('0원');
  });
  it('formatCompact: 1만 이상은 소수 첫째 자리 만 단위, 미만은 콤마', () => {
    expect(formatCompact(97_242)).toBe('9.7만');
    expect(formatCompact(100_000)).toBe('10만');
    expect(formatCompact(123_861)).toBe('12.4만');
    expect(formatCompact(780_000)).toBe('78만');
    expect(formatCompact(1_320_000)).toBe('132만');
    expect(formatCompact(4_725_000)).toBe('472.5만');
    expect(formatCompact(8_279)).toBe('8,279');
    expect(formatCompact(918)).toBe('918');
  });
  it('formatPercent / formatRating / formatCostPerView / formatInt', () => {
    expect(formatPercent(6.5)).toBe('6.5%');
    expect(formatPercent(7)).toBe('7.0%');
    expect(formatRating(4.42)).toBe('4.4');
    expect(formatRating(5)).toBe('5.0');
    expect(formatCostPerView(84.55)).toBe('85원');
    expect(formatCostPerView(22.18)).toBe('22원');
    expect(formatCostPerView(1234.6)).toBe('1,235원');
    expect(formatInt(1234567)).toBe('1,234,567');
  });
});
