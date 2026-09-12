import type { ResultFilters } from '../domain/recommend';
import type { Platform } from '../domain/types';

interface Props {
  count: number;
  filters: ResultFilters;
  onChange: (f: ResultFilters) => void;
}

const PLATFORM_OPTIONS: { value: 'all' | Platform; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '유튜브', label: '유튜브' },
  { value: '인스타그램', label: '인스타그램' },
];

/** 결과 조작 줄: 인원 제목 + 플랫폼 세그먼트 + 이력 체크 (설계 §6.1 4) */
export function ResultsToolbar({ count, filters, onChange }: Props) {
  return (
    <div className="toolbar">
      <h2 className="results__title">섭외 가능한 크리에이터 {count}명</h2>
      <div className="toolbar__controls">
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
