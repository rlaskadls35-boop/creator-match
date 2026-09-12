import { SORT_LABEL } from '../domain/recommend';
import type { SortKey, SortState } from '../domain/recommend';

interface Props {
  count: number;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
}

/** 좁은 화면에서는 표가 카드로 접혀 머리글 정렬 버튼이 없으므로 여기서 정렬한다 (L23) */
const SORT_KEYS: SortKey[] = ['match', 'engagement', 'views', 'campaigns', 'rating', 'rate', 'costPerView'];

/** 결과 조작 줄: 인원 제목 + 좁은 화면의 정렬 선택 */
export function ResultsToolbar({ count, sort, onSortChange }: Props) {
  return (
    <div className="toolbar">
      <h2 className="results__title">캠페인 이력이 있는 후보 {count}명</h2>
      <div className="toolbar__controls">
        <div className="toolbar__sort">
          <label htmlFor="sort-key">정렬</label>
          <select id="sort-key" className="toolbar__select" value={sort.key} onChange={(e) => onSortChange(e.target.value as SortKey)}>
            {SORT_KEYS.map((k) => (
              <option key={k} value={k}>{SORT_LABEL[k]}</option>
            ))}
          </select>
          <button type="button" className="toolbar__dir" aria-label={`${SORT_LABEL[sort.key]} ${sort.direction === 'asc' ? '오름차순' : '내림차순'}, 방향 바꾸기`} onClick={() => onSortChange(sort.key)}>
            {sort.direction === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      </div>
    </div>
  );
}
