import type { Creator, DatasetStats } from '../domain/types';
import type { NewCandidateSortKey } from '../domain/recommend';
import { formatCompact, formatPercent, formatWon } from '../domain/format';
import { Tooltip } from './Tooltip';

interface Props {
  rows: Creator[];
  stats: DatasetStats;
  sortKey: NewCandidateSortKey;
  onSortChange: (key: NewCandidateSortKey) => void;
}

export function NewCandidatesTable({ rows, stats, sortKey, onSortChange }: Props) {
  return (
    <section className="new-candidates" aria-labelledby="new-candidates-title">
      <div className="new-candidates__head">
        <div>
          <span className="new-candidates__eyebrow">채널 지표로 살펴보기</span>
          <h2 id="new-candidates-title" className="results__title">추가 확인이 필요한 신규 후보 {rows.length}명</h2>
        </div>
        <div className="new-candidates__sort">
          <label htmlFor="new-candidate-sort">정렬</label>
          <select id="new-candidate-sort" className="toolbar__select" value={sortKey} onChange={(e) => onSortChange(e.target.value as NewCandidateSortKey)}>
            <option value="engagement">참여율 높은 순</option>
            <option value="views">평균 조회수 높은 순</option>
          </select>
        </div>
      </div>
      <p className="new-candidates__desc">선택한 카테고리·규모에 맞는 신규 후보입니다. 캠페인 이력이 없어 종합순위를 매기지 않으며, 단가와 예산 충족 여부는 확인이 필요합니다.</p>
      {rows.length === 0 ? (
        <p className="results__empty">선택한 조건과 플랫폼에 맞는 신규 후보가 없습니다.</p>
      ) : (
        <div className="table-wrap">
          <table className="table table--new" aria-label="추가 확인이 필요한 신규 후보">
            <thead>
              <tr>
                <th scope="col">크리에이터</th>
                <th scope="col" className="table__num">참여율</th>
                <th scope="col" className="table__num">평균 조회수</th>
                <th scope="col" className="table__num">캠페인</th>
                <th scope="col" className="table__num">평점</th>
                <th scope="col" className="table__num">단가</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const referenceRate = stats.medianRateByTier[c.tier];
                return (
                  <tr key={c.id}>
                    <td className="table__creator">
                      <div className="creator__name"><strong>{c.name}</strong><span className="badge badge--warning">캠페인 이력 없음</span></div>
                      <div className="creator__meta">{c.platform} · {c.category} · 팔로워 {formatCompact(c.followers)}</div>
                    </td>
                    <td className="table__num" data-label="참여율">{formatPercent(c.engagementRate)}</td>
                    <td className="table__num" data-label="평균 조회수">{formatCompact(c.avgViewCount)}</td>
                    <td className="table__num" data-label="캠페인">0건</td>
                    <td className="table__num" data-label="평점"><span className="new-candidates__unknown">없음</span></td>
                    <td className="table__num" data-label="단가">
                      <strong className="new-candidates__unknown">확인 필요</strong>
                      {referenceRate > 0 && <span className="new-candidates__reference">같은 규모 참고 {formatCompact(referenceRate)}원<Tooltip label={`${c.name} 참고 단가 설명`} text={`이 후보의 견적이 아닙니다. 이력이 있는 ${c.tier} 크리에이터들의 평균 단가 중앙값 ${formatWon(referenceRate)}입니다. 예산 판단이나 매칭 점수에 사용하지 않습니다.`} /></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
