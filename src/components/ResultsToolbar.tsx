import { SORT_LABEL } from '../domain/recommend';
import type { ResultFilters, SortKey, SortState } from '../domain/recommend';
import type { Platform } from '../domain/types';

interface Props {
  count: number;
  filters: ResultFilters;
  onChange: (f: ResultFilters) => void;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
}

/** 좁은 화면에서는 표가 카드로 접혀 머리글 정렬 버튼이 없으므로 여기서 정렬한다 (L23) */
const SORT_KEYS: SortKey[] = ['match', 'engagement', 'views', 'campaigns', 'rating', 'rate'];

const PLATFORM_OPTIONS: { value: 'all' | Platform; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '유튜브', label: '유튜브' },
  { value: '인스타그램', label: '인스타그램' },
];

/** 결과 조작 줄: 인원 제목 + 플랫폼 세그먼트 + 이력 체크 (설계 §6.1 4) */
export function ResultsToolbar({ count, filters, onChange, sort, onSortChange }: Props) {
  return (
    <div className="toolbar">
      <h2 className="results__title">섭외 가능한 크리에이터 {count}명</h2>
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
        <div className="segment" role="group" aria-label="플랫폼">
          {PLATFORM_OPTIONS.map((o) => {
            const on = filters.platform === o.value;
            return (
              <button key={o.value} type="button" className={`segment__item${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, platform: o.value })}>
                {o.label}
              </button>
            );
          })}
        </div>
        <label className="check">
          <input type="checkbox" checked={filters.historyOnly} onChange={(e) => onChange({ ...filters, historyOnly: e.target.checked })} />
          캠페인 이력 있는 크리에이터만
        </label>
      </div>
    </div>
  );
}
