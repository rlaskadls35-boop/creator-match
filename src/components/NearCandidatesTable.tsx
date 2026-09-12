import type { NearCandidate } from '../domain/recommend';
import { formatCompact, formatPercent } from '../domain/format';

/** 조건에 가장 가까운 크리에이터 표 (설계 §5.7 3, §6.2) */
export function NearCandidatesTable({ items }: { items: NearCandidate[] }) {
  return (
    <section className="near">
      <h3 className="near__title">조건에 가장 가까운 크리에이터</h3>
      <p className="near__desc">세 조건 중 하나만 바꾸면 섭외할 수 있는 크리에이터입니다.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">순위</th>
              <th scope="col">크리에이터</th>
              <th scope="col" className="table__num">매칭 점수</th>
              <th scope="col" className="table__num">참여율</th>
              <th scope="col" className="table__num">평균 조회수</th>
              <th scope="col" className="table__num">단가</th>
              <th scope="col">이렇게 바꾸면 섭외 가능</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n, i) => {
              const c = n.creator;
              return (
                <tr key={c.id}>
                  <td><span className="rank">{i + 1}</span></td>
                  <td className="table__creator">
                    <div className="creator__name">
                      <strong>{c.name}</strong>
                      {!c.hasHistory && <span className="badge badge--warning">캠페인 이력 없음</span>}
                    </div>
                    <div className="creator__meta">{c.platform} · {c.category} · {c.tier} · 팔로워 {formatCompact(c.followers)}</div>
                  </td>
                  <td className="table__num"><strong>{Math.round(c.matchScore)}</strong></td>
                  <td className="table__num">{formatPercent(c.engagementRate)}</td>
                  <td className="table__num">{formatCompact(c.avgViewCount)}</td>
                  <td className="table__num">{c.hasHistory ? formatCompact(c.rate) : <span className="estimate">예상 {formatCompact(c.rate)}</span>}</td>
                  <td><span className="chip chip--change">{n.change}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
