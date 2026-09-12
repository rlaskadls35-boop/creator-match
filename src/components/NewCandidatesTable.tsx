import type { Creator } from '../domain/types';
import { SORT_LABEL } from '../domain/recommend';
import type { NewCandidateSortKey, NewCandidateSortState } from '../domain/recommend';
import { formatInt, formatPercent } from '../domain/format';

interface Props {
  rows: Creator[];
  sort: NewCandidateSortState;
  onSortChange: (key: NewCandidateSortKey) => void;
}

const SORTABLE: { key: NewCandidateSortKey; heading: string }[] = [
  { key: 'followers', heading: '팔로워수' },
  { key: 'views', heading: '평균\n조회수' },
  { key: 'engagement', heading: '참여율' },
];

export function NewCandidatesTable({ rows, sort, onSortChange }: Props) {
  return (
    <section className="new-candidates" aria-labelledby="new-candidates-title">
      <h2 id="new-candidates-title" className="results__title">캠페인 이력이 없는 후보 {rows.length}명</h2>
      <p className="new-candidates__desc">선택한 플랫폼·카테고리·규모에 맞는 후보입니다. 단가 정보가 없어 예산 충족 여부는 별도 확인이 필요합니다.</p>
      {rows.length === 0 ? (
        <p className="results__empty">선택한 플랫폼·카테고리·규모에 맞는 캠페인 이력이 없는 후보가 없습니다.</p>
      ) : (
        <div className="table-wrap">
          <table className="table table--new" aria-label="캠페인 이력이 없는 후보">
            <thead>
              <tr>
                <th scope="col">크리에이터</th>
                <th scope="col">플랫폼</th>
                <th scope="col">카테고리</th>
                {SORTABLE.map(({ key, heading }) => {
                  const active = sort.key === key;
                  return (
                    <th key={key} scope="col" aria-label={SORT_LABEL[key]} className={`table__num${active ? ' is-sorted' : ''}`} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <span className="th__head">
                        <button type="button" className="sort-btn" aria-label={SORT_LABEL[key]} onClick={() => onSortChange(key)}>
                          <span className="th__label">{heading}</span>
                          <span className="sort-btn__arrow" aria-hidden="true">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="table__creator">
                    <div className="creator__name"><strong>{c.name}</strong></div>
                  </td>
                  <td className="table__text" data-label="플랫폼">{c.platform}</td>
                  <td className="table__text" data-label="카테고리">{c.category}</td>
                  <td className="table__num" data-label="팔로워 수">{formatInt(c.followers)}명</td>
                  <td className="table__num" data-label="평균 조회수">{formatInt(c.avgViewCount)}회</td>
                  <td className="table__num" data-label="참여율">{formatPercent(c.engagementRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
