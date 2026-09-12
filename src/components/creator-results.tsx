import type { Creator } from "@/lib/creator-types";

function formatNumber(value: number | null, suffix: string) {
  return value === null ? "정보 없음" : `${value.toLocaleString("ko-KR")}${suffix}`;
}

export default function CreatorResults({ creators, unknownBudgetCount }: { creators: Creator[]; unknownBudgetCount: number }) {
  return (
    <section className="results-section" aria-labelledby="results-heading">
      <div className="results-header">
        <h2 id="results-heading">크리에이터 결과 <span>{creators.length.toLocaleString("ko-KR")}명</span></h2>
        <p>평균 진행 예산은 과거 캠페인 기준이며, 현재 확정 견적은 아닙니다.</p>
      </div>
      {creators.length > 0 ? (
        <div className="table-container">
          <table className="creator-table" role="table">
            <caption className="visually-hidden">선택한 캠페인 조건에 맞는 크리에이터 {creators.length}명</caption>
            <colgroup>
              {[15, 10, 10, 14, 11, 11, 7, 12, 10].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">크리에이터</th>
                <th scope="col">플랫폼</th>
                <th scope="col">카테고리</th>
                <th scope="col" className="numeric-cell">평균 진행 예산</th>
                <th scope="col" className="numeric-cell">팔로워 수</th>
                <th scope="col" className="numeric-cell">평균 조회수</th>
                <th scope="col" className="numeric-cell">참여율</th>
                <th scope="col" className="numeric-cell">누적 캠페인 건수</th>
                <th scope="col" className="numeric-cell">광고주 평점</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {creators.map((creator) => (
                <tr key={creator.id} role="row">
                  <th scope="row" role="rowheader">{creator.name}</th>
                  <td role="cell" data-label="플랫폼">{creator.platform}</td>
                  <td role="cell" data-label="카테고리">{creator.category}</td>
                  <td role="cell" data-label="평균 진행 예산" className="numeric-cell budget-cell">{creator.avgCampaignBudgetKrw === null ? "예산 확인 필요" : formatNumber(creator.avgCampaignBudgetKrw, "원")}</td>
                  <td role="cell" data-label="팔로워 수" className="numeric-cell">{formatNumber(creator.followers, "명")}</td>
                  <td role="cell" data-label="평균 조회수" className="numeric-cell">{formatNumber(creator.avgViewCount, "회")}</td>
                  <td role="cell" data-label="참여율" className="numeric-cell">{formatNumber(creator.engagementRate, "%")}</td>
                  <td role="cell" data-label="누적 캠페인 건수" className="numeric-cell">{formatNumber(creator.totalCampaignCount, "건")}</td>
                  <td role="cell" data-label="광고주 평점" className="numeric-cell">{creator.advertiserRating === null ? <span className="unrated">평가 없음</span> : `${creator.advertiserRating.toFixed(1)} / 5`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-results">
          <h3>조건에 맞는 크리에이터가 없어요.</h3>
          <p>예산을 높이거나 카테고리·플랫폼·팔로워 규모를 변경한 뒤 다시 확인해 주세요.</p>
        </div>
      )}
      {unknownBudgetCount > 0 && <p className="results-footnote">선택한 카테고리·플랫폼·규모 중 진행 예산을 확인할 수 없는 {unknownBudgetCount}명은 결과에서 제외했어요.</p>}
    </section>
  );
}
