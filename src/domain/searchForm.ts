import type { Category, Platform, Tier } from './types';
import type { SearchInput } from './recommend';

export interface SearchFormState {
  platform: 'all' | Platform;
  budgetText: string;
  categories: Category[];
  tier: Tier | null;
}

export const EMPTY_FORM: SearchFormState = { platform: 'all', budgetText: '', categories: [], tier: null };

/** 입력 문자열에서 숫자만 남기고 천 단위 콤마를 넣는다 */
export function formatBudgetText(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits === '' ? '' : Number(digits).toLocaleString('ko-KR');
}

export function parseBudgetText(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export interface FormErrors {
  budget?: string;
  categories?: string;
  tier?: string;
}

export function validateForm(form: SearchFormState): FormErrors {
  const errors: FormErrors = {};
  if (parseBudgetText(form.budgetText) === null) errors.budget = '예산을 입력해 주세요. 0보다 큰 금액이어야 합니다.';
  if (form.categories.length === 0) errors.categories = '카테고리를 하나 이상 선택해 주세요.';
  if (form.tier === null) errors.tier = '크리에이터 규모를 선택해 주세요.';
  return errors;
}

export function toSearchInput(form: SearchFormState): SearchInput | null {
  const budget = parseBudgetText(form.budgetText);
  if (budget === null || form.categories.length === 0 || form.tier === null) return null;
  return { platform: form.platform, budget, categories: [...form.categories], tier: form.tier };
}

/** 완화 버튼으로 조건이 바뀌면 폼에도 반영한다 (설계 §6.2) */
export function fromSearchInput(input: SearchInput): SearchFormState {
  return { platform: input.platform, budgetText: formatBudgetText(String(input.budget)), categories: [...input.categories], tier: input.tier };
}
