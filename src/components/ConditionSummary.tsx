import type { SearchInput } from '../domain/recommend';
import { formatWon } from '../domain/format';

interface Props {
  input: SearchInput;
  note?: { text: string; waiting: boolean };
}

/** 운영자 화면에서 지금 미리보기가 어떤 조건으로 뽑힌 결과인지 한 줄로 (L23) */
export function ConditionSummary({ input, note }: Props) {
  return (
    <div className="conditions">
      <span className="conditions__items" aria-label="추천 결과 미리보기 조건">
        <strong>미리보기 조건</strong>
        <span>1명당 예산 <strong>{formatWon(input.budget)}</strong></span>
        <span>카테고리 <strong>{input.categories.join(', ')}</strong></span>
        <span>규모 <strong>{input.tier}</strong></span>
      </span>
      {note && (
        <span className="conditions__note" data-wait={note.waiting} role="status" aria-live="polite">{note.text}</span>
      )}
    </div>
  );
}
