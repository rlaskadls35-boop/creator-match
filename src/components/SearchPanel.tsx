import { useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CATEGORIES, TIERS } from '../domain/types';
import type { Category, Tier } from '../domain/types';
import { TIER_INFO } from '../domain/tiers';
import { formatWon } from '../domain/format';
import { formatBudgetText, parseBudgetText, validateForm } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';

interface Props {
  value: SearchFormState;
  onChange: (next: SearchFormState) => void;
  onSubmit: () => void;
}

/** 콤마 재포맷 후에도 커서를 "방금 입력한 숫자" 바로 뒤에 되돌리기 위한 위치 계산.
 *  자릿수 구분 콤마가 그 자리에 새로 끼어들면 콤마도 건너뛴다 (설계 리뷰 지적, Task 12 수정) */
function caretIndexForDigitsBefore(text: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0;
  let count = 0;
  let idx = text.length;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i])) {
      count += 1;
      if (count === digitsBefore) {
        idx = i + 1;
        break;
      }
    }
  }
  while (idx < text.length && !/\d/.test(text[idx])) idx += 1;
  return idx;
}

export function SearchPanel({ value, onChange, onSubmit }: Props) {
  // 빨간 안내는 한 번 건드린 입력에만 보인다 (L21). 버튼 비활성은 항상 적용
  const [touched, setTouched] = useState({ budget: false, categories: false, tier: false });
  const errors = validateForm(value);
  const budget = parseBudgetText(value.budgetText);
  const canSubmit = !errors.budget && !errors.categories && !errors.tier;
  const budgetRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  // 포맷 후 텍스트가 그대로여도(예: 숫자 사이에 문자를 넣은 경우) 커서 복원이 일어나도록
  // value.budgetText가 아니라 이 값을 effect의 키로 쓴다 (최종 리뷰 지적)
  const [caretTick, setCaretTick] = useState(0);

  const handleBudgetChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const selectionStart = e.target.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, selectionStart).replace(/\D/g, '').length;
    const next = formatBudgetText(raw);
    caretRef.current = caretIndexForDigitsBefore(next, digitsBefore);
    setCaretTick((t) => t + 1);
    onChange({ ...value, budgetText: next });
  };

  useLayoutEffect(() => {
    if (caretRef.current !== null && budgetRef.current) {
      budgetRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [caretTick]);

  const toggleCategory = (c: Category) => {
    const has = value.categories.includes(c);
    onChange({ ...value, categories: has ? value.categories.filter((x) => x !== c) : [...value.categories, c] });
    setTouched((t) => ({ ...t, categories: true }));
  };
  const pickTier = (t: Tier) => {
    onChange({ ...value, tier: t });
    setTouched((s) => ({ ...s, tier: true }));
  };

  return (
    <form
      className="card panel"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <div className="panel__grid">
        <div className="field">
          <label className="field__label" htmlFor="budget">크리에이터 1명당 섭외 예산</label>
          <p className="field__help">한 명에게 쓸 수 있는 최대 금액입니다. 이 금액 이하로 진행 가능한 크리에이터를 찾아드립니다.</p>
          <div className="budget">
            <input
              id="budget"
              ref={budgetRef}
              className="input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="예: 1,500,000"
              value={value.budgetText}
              onChange={handleBudgetChange}
              onBlur={() => setTouched((t) => ({ ...t, budget: true }))}
              aria-invalid={touched.budget && !!errors.budget}
              aria-describedby="budget-preview"
            />
            <span className="budget__unit">원</span>
            <span id="budget-preview" className="budget__preview">{budget !== null ? `→ ${formatWon(budget)}` : ''}</span>
          </div>
          {touched.budget && errors.budget && <p className="field__error" role="alert">{errors.budget}</p>}
        </div>

        <div className="field">
          <div className="field__label" id="categories-label">캠페인 카테고리 (여러 개 선택 가능)</div>
          <p className="field__help">광고할 제품이나 서비스와 맞는 분야를 고르세요.</p>
          <div className="chips" role="group" aria-labelledby="categories-label">
            {CATEGORIES.map((c) => {
              const on = value.categories.includes(c);
              return (
                <button key={c} type="button" className={`chip chip--toggle${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleCategory(c)}>
                  {c}
                </button>
              );
            })}
          </div>
          {touched.categories && errors.categories && <p className="field__error" role="alert">{errors.categories}</p>}
        </div>

        <div className="field">
          <div className="field__label" id="tier-label">크리에이터 규모 (구독자·팔로워 수 기준)</div>
          <div className="tiers" role="radiogroup" aria-labelledby="tier-label">
            {TIERS.map((t) => {
              const on = value.tier === t;
              const info = TIER_INFO[t];
              return (
                <button key={t} type="button" role="radio" aria-checked={on} className={`tier-card${on ? ' is-on' : ''}`} onClick={() => pickTier(t)}>
                  <span className="tier-card__name">{t}</span>
                  <span className="tier-card__range">{info.range}</span>
                </button>
              );
            })}
          </div>
          {touched.tier && errors.tier && <p className="field__error" role="alert">{errors.tier}</p>}
        </div>
      </div>
      <button type="submit" className="btn btn--primary panel__submit" disabled={!canSubmit}>크리에이터 찾기</button>
    </form>
  );
}
