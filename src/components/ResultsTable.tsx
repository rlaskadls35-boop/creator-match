import { Fragment } from 'react';
import type { DatasetStats, RankedCreator, Weights } from '../domain/types';
import { SORT_LABEL } from '../domain/recommend';
import type { SortKey, SortState } from '../domain/recommend';
import { formatInt, formatPercent, formatRating } from '../domain/format';
import { Tooltip } from './Tooltip';
import { ExplainRow } from './ExplainRow';
import { ScoreBreakdown } from './ScoreBreakdown';

interface Props {
  rows: RankedCreator[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  stats: DatasetStats;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  variant?: 'advertiser' | 'admin';
  /** 운영자 화면에서 계산 내역에 쓰는 현재 미리보기 비중 */
  weights?: Weights;
  /** 저장된 비중으로 계산한 매칭 점수 (운영자 화면 비교용) */
  savedScoreById?: Map<string, number> | null;
  /** 저장된 비중 기준 순위 (매칭 점수 정렬일 때만) */
  priorRankById?: Map<string, number> | null;
}

const SORTABLE: { key: SortKey; label: string; tooltip?: string }[] = [
  { key: 'match', label: '매칭 점수', tooltip: '광고주 조건에 맞는 크리에이터들을 같은 규모 안에서 비교한 종합 점수입니다. 100점 만점이며, 20점 단위로 색이 달라집니다. 80점 이상 초록 → 20점 미만 빨강' },
  { key: 'followers', label: '팔로워 수' },
  { key: 'views', label: '평균 조회수' },
  { key: 'engagement', label: '참여율' },
  { key: 'campaigns', label: '누적 캠페인', tooltip: '지금까지 집행한 캠페인 건수입니다. 협업 경험을 참고하는 정보이며 매칭 점수에는 반영하지 않습니다.' },
  { key: 'rating', label: '광고주 평점' },
  { key: 'rate', label: '1건 평균 단가', tooltip: '과거 캠페인 1건당 평균 집행 금액입니다. 확정 견적이 아니라 예산 판단을 위한 참고값입니다.' },
];

/** 순위·크리에이터·플랫폼·카테고리 열 + 정렬 가능 열 + 추천 이유 열 (설계 리뷰 지적: 매직 넘버 제거) */
const COLUMN_COUNT = 4 + SORTABLE.length + 1;

/** 매칭 점수 뱃지 색 단계. 20점 단위로 80점 이상이 초록, 20점 미만이 빨강 */
export function scoreBand(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

/** 저장값 대비 점수 변화 문구. 0.05점 미만이면 "동일"로 본다 (L23) */
export function scoreDeltaText(delta: number): string {
  if (Math.abs(delta) < 0.05) return '저장값과 동일';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}점`;
}

export function ResultsTable({
  rows, sort, onSortChange, expandedId, onToggleExpand,
  variant = 'advertiser', weights, savedScoreById, priorRankById,
}: Props) {
  const admin = variant === 'admin';
  const rankHeader = sort.key === 'match' ? '순위' : `순위 (${SORT_LABEL[sort.key]} 기준)`;
  return (
    <div className="table-wrap">
      <table aria-label="캠페인 이력이 있는 후보" className={`table${admin ? ' table--admin' : ''}`}>
        <thead>
          <tr>
            <th scope="col">{rankHeader}</th>
            <th scope="col">크리에이터</th>
            <th scope="col">플랫폼</th>
            <th scope="col">카테고리</th>
            {SORTABLE.map((col) => {
              const active = sort.key === col.key;
              const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={col.key} scope="col" aria-sort={ariaSort} className={`table__num${active ? ' is-sorted' : ''}`}>
                  <span className="th__head">
                    <button type="button" className="sort-btn" onClick={() => onSortChange(col.key)}>
                      {col.label}
                      <span className="sort-btn__arrow" aria-hidden="true">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                    {col.tooltip && <Tooltip text={col.tooltip} label={`${col.label} 설명`} />}
                  </span>
                </th>
              );
            })}
            <th scope="col">{admin ? '점수 설명' : '추천 이유 보기'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const open = expandedId === c.id;
            const score = Math.round(c.matchScore);
            const savedScore = savedScoreById?.get(c.id);
            const delta = savedScore === undefined ? null : c.matchScore - savedScore;
            const prior = priorRankById?.get(c.id);
            return (
              <Fragment key={c.id}>
                <tr className={i === 0 ? 'row--top' : ''}>
                  <td>
                    <span className={`rank${i === 0 ? ' rank--top' : ''}`}>{i + 1}</span>
                    {prior !== undefined && prior !== i + 1 && <span className="delta">{prior}위에서</span>}
                  </td>
                  <td className="table__creator">
                    <div className="creator__name">
                      <strong>{c.name}</strong>
                      {!c.hasHistory && <span className="badge badge--warning">캠페인 이력 없음</span>}
                    </div>
                  </td>
                  <td className="table__text" data-label="플랫폼">{c.platform}</td>
                  <td className="table__text" data-label="카테고리">{c.category}</td>
                  <td className="table__num" data-label="매칭 점수">
                    <span className="score-badge" data-band={scoreBand(score)}>{score}</span>
                    {delta !== null && (
                      <span className="delta" data-up={delta >= 0.05}>{scoreDeltaText(delta)}</span>
                    )}
                  </td>
                  <td className="table__num" data-label="팔로워 수">{formatInt(c.followers)}명</td>
                  <td className="table__num" data-label="평균 조회수">{formatInt(c.avgViewCount)}회</td>
                  <td className="table__num" data-label="참여율">{formatPercent(c.engagementRate)}</td>
                  <td className="table__num" data-label="누적 캠페인">{c.totalCampaignCount}건</td>
                  <td className="table__num" data-label="광고주 평점">{formatRating(c.rating)} / 5</td>
                  <td className="table__num table__rate" data-label="1건 평균 단가">{formatInt(c.rate)}원</td>
                  <td className="table__action">
                    <button
                      type="button"
                      className={`expand-btn${admin ? ' expand-btn--text' : ''}`}
                      aria-expanded={open}
                      aria-label={`${c.name} ${admin ? '계산 내역' : '추천 이유'} ${open ? '접기' : '보기'}`}
                      onClick={() => onToggleExpand(c.id)}
                    >
                      {admin ? (open ? '접기' : '계산 보기') : (open ? '▾' : '▸')}
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr className="explain-row">
                    <td colSpan={COLUMN_COUNT}>
                      {admin && weights
                        ? <ScoreBreakdown creator={c} weights={weights} />
                        : <ExplainRow creator={c} />}
                    </td>
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
