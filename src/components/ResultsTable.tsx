import { Fragment } from 'react';
import type { DatasetStats, RankedCreator } from '../domain/types';
import { SORT_LABEL } from '../domain/recommend';
import type { SortKey, SortState } from '../domain/recommend';
import { formatCompact, formatPercent, formatRating, formatWon } from '../domain/format';
import { Tooltip } from './Tooltip';
import { ExplainRow } from './ExplainRow';

interface Props {
  rows: RankedCreator[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  stats: DatasetStats;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

const SORTABLE: { key: SortKey; label: string; tooltip?: string }[] = [
  { key: 'match', label: '매칭 점수', tooltip: '광고주 조건에 맞는 크리에이터들을 같은 규모 안에서 비교한 종합 점수입니다. 100점 만점' },
  { key: 'engagement', label: '참여율' },
  { key: 'views', label: '평균 조회수' },
  { key: 'campaigns', label: '캠페인' },
  { key: 'rating', label: '평점' },
  { key: 'rate', label: '단가' },
];

/** 설계 §4 "예상 평점 툴팁" */
export function estimatedRatingTooltip(stats: DatasetStats): string {
  return `캠페인 이력이 없어 실제 평점이 없습니다. 이력이 있는 크리에이터 ${stats.ratedCount}명의 평균 평점 ${stats.ratingAverage}점을 예상 평점으로 적용했습니다. 순위 계산에서는 캠페인 건수 0건이 반영되어 검증된 크리에이터보다 낮게 평가됩니다.`;
}

/** 설계 §4 "예상 단가 툴팁" */
export function estimatedRateTooltip(c: RankedCreator, stats: DatasetStats): string {
  return `캠페인 이력이 없어 실제 단가가 없습니다. 같은 ${c.tier} 규모 크리에이터의 캠페인당 단가 중앙값 ${formatWon(stats.medianRateByTier[c.tier])}을 예상 단가로 적용했습니다.`;
}

export function ResultsTable({ rows, sort, onSortChange, stats, expandedId, onToggleExpand }: Props) {
  const rankHeader = sort.key === 'match' ? '순위' : `순위 (${SORT_LABEL[sort.key]} 기준)`;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{rankHeader}</th>
            <th scope="col">크리에이터</th>
            {SORTABLE.map((col) => {
              const active = sort.key === col.key;
              const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={col.key} scope="col" aria-sort={ariaSort} className={`table__num${active ? ' is-sorted' : ''}`}>
                  <button type="button" className="sort-btn" onClick={() => onSortChange(col.key)}>
                    {col.label}
                    <span className="sort-btn__arrow" aria-hidden="true">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </button>
                  {col.tooltip && <Tooltip text={col.tooltip} label="매칭 점수 설명" />}
                </th>
              );
            })}
            <th scope="col">추천 이유 보기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const open = expandedId === c.id;
            const score = Math.round(c.matchScore);
            return (
              <Fragment key={c.id}>
                <tr className={`${i === 0 ? 'row--top' : ''}${open ? ' is-open' : ''}`}>
                  <td><span className={`rank${i === 0 ? ' rank--top' : ''}`}>{i + 1}</span></td>
                  <td className="table__creator">
                    <div className="creator__name">
                      <strong>{c.name}</strong>
                      {!c.hasHistory && <span className="badge badge--warning">캠페인 이력 없음</span>}
                    </div>
                    <div className="creator__meta">{c.platform} · {c.category} · 팔로워 {formatCompact(c.followers)}</div>
                  </td>
                  <td className="table__num">
                    <div className="score">
                      <span className="bar bar--score"><span className="bar__fill" style={{ width: `${score}%` }} /></span>
                      <strong>{score}</strong>
                    </div>
                  </td>
                  <td className="table__num">{formatPercent(c.engagementRate)}</td>
                  <td className="table__num">{formatCompact(c.avgViewCount)}</td>
                  <td className="table__num">{c.totalCampaignCount}건</td>
                  <td className="table__num">
                    {c.hasHistory ? formatRating(c.rating) : (
                      <span className="estimate">예상 {formatRating(c.rating)}<Tooltip text={estimatedRatingTooltip(stats)} label="예상 평점 설명" /></span>
                    )}
                  </td>
                  <td className="table__num">
                    {c.hasHistory ? formatCompact(c.rate) : (
                      <span className="estimate">예상 {formatCompact(c.rate)}<Tooltip text={estimatedRateTooltip(c, stats)} label="예상 단가 설명" /></span>
                    )}
                  </td>
                  <td className="table__action">
                    <button type="button" className="expand-btn" aria-expanded={open} aria-label={`${c.name} 추천 이유 ${open ? '접기' : '보기'}`} onClick={() => onToggleExpand(c.id)}>
                      {open ? '▾' : '▸'}
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr className="explain-row">
                    <td colSpan={9}><ExplainRow creator={c} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
