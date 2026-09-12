import { describe, it, expect } from 'vitest';
import { EMPTY_FORM, formatBudgetText, parseBudgetText, validateForm, toSearchInput, fromSearchInput } from './searchForm';

describe('searchForm', () => {
  it('formatBudgetText: 숫자만 남기고 천 단위 콤마', () => {
    expect(formatBudgetText('1500000')).toBe('1,500,000');
    expect(formatBudgetText('1,5x00')).toBe('1,500');
    expect(formatBudgetText('abc')).toBe('');
    expect(formatBudgetText('0')).toBe('0');
    expect(formatBudgetText('007')).toBe('7');
  });
  it('parseBudgetText: 콤마 있는 문자열 → 숫자, 비었거나 0이면 null', () => {
    expect(parseBudgetText('1,500,000')).toBe(1_500_000);
    expect(parseBudgetText('')).toBeNull();
    expect(parseBudgetText('0')).toBeNull();
  });
  it('validateForm: 빈 폼은 오류 3개, 채우면 없음', () => {
    const e = validateForm(EMPTY_FORM);
    expect(e.budget).toBe('예산을 입력해 주세요. 0보다 큰 금액이어야 합니다.');
    expect(e.categories).toBe('카테고리를 하나 이상 선택해 주세요.');
    expect(e.tier).toBe('크리에이터 규모를 선택해 주세요.');
    expect(validateForm({ platform: 'all', budgetText: '1,500,000', categories: ['뷰티'], tier: '마이크로', historyOnly: false })).toEqual({});
  });
  it('toSearchInput ↔ fromSearchInput 왕복', () => {
    const form = { platform: '유튜브' as const, budgetText: '1,500,000', categories: ['뷰티', '패션'] as ('뷰티' | '패션')[], tier: '마이크로' as const, historyOnly: false };
    const input = toSearchInput(form)!;
    expect(input).toEqual({ platform: '유튜브', budget: 1_500_000, categories: ['뷰티', '패션'], tier: '마이크로' });
    expect(fromSearchInput(input)).toEqual(form);
    expect(toSearchInput(EMPTY_FORM)).toBeNull();
  });
});
