import { METRIC_KEYS } from '../domain/types';
import type { DatasetStats, MetricKey, RankedCreator, Weights } from '../domain/types';
import { METRIC_LABEL } from '../domain/weights';
import { rankText } from '../domain/explain';
import { formatCostPerView, formatInt, formatPercent, formatRating, formatWon } from '../domain/format';

interface Props {
  creator: RankedCreator;
  weights: Weights;
  stats: DatasetStats;
}

/** 항목별 "실제 수치" 칸 */
const RAW_VALUE: Record<MetricKey, (c: RankedCreator) => string> = {
  engagement: (c) => formatPercent(c.engagementRate),
  views: (c) => `${formatInt(c.avgViewCount)}회`,
  rating: (c) => (c.ratingIsEstimated ? '평가 없음' : `${formatRating(c.rating)} / 5점`),
  costPerView: (c) => `${formatCostPerView(c.costPerView)} / 회`,
  campaigns: (c) => `${c.totalCampaignCount}건`,
};

/** 실제 수치와 계산에 쓴 값이 다를 때만 덧붙이는 한 줄 */
const BASIS: Partial<Record<MetricKey, (c: RankedCreator) => string | null>> = {
  rating: (c) => (c.ratingIsEstimated ? `계산에는 예상 평점 ${c.rating.toFixed(2)}점 사용` : null),
  costPerView: (c) => `${c.rateIsEstimated ? '예상 단가' : '단가'} ${formatWon(c.rate)} ÷ ${formatInt(c.avgViewCount)}회`,
};

/** 운영자 화면 펼침: 매칭 점수가 어떻게 나온 값인지 항목별로 보여 준다 (L23) */
export function ScoreBreakdown({ creator, weights, stats }: Props) {
  const campaignScore = creator.metrics.campaigns.score;
  return (
    <section className="breakdown" aria-label={`${creator.name} 매칭 점수 계산 내역`}>
      <div className="breakdown__head">
        <h3 className="breakdown__title">매칭 점수 계산 내역</h3>
        <span className="breakdown__total">
          합산 {creator.matchScore.toFixed(1)}점 · 최종 표시 <strong>{Math.round(creator.matchScore)}점</strong>
        </span>
      </div>
      <table className="breakdown__table">
        <thead>
          <tr>
            <th scope="col">평가 항목</th>
            <th scope="col">실제 수치 / 계산 기준</th>
            <th scope="col">항목 평가<br />(100점 만점)</th>
            <th scope="col">반영 비중</th>
            <th scope="col">매칭 점수에 반영</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_KEYS.map((k) => {
            const m = creator.metrics[k];
            const basis = BASIS[k]?.(creator) ?? null;
            const flagged = k === 'campaigns' && !creator.hasHistory;
            return (
              <tr key={k} className={flagged ? 'breakdown__row--flag' : undefined}>
                <td className="breakdown__metric">{METRIC_LABEL[k]}</td>
                <td data-label="실제 수치 / 계산 기준">
                  <strong>{RAW_VALUE[k](creator)}</strong>
                  {basis && <small>{basis}</small>}
                </td>
                <td data-label="항목 평가 (100점 만점)" className="breakdown__num">
                  <strong>{m.score.toFixed(1)}점</strong>
                  <small>{rankText(m)}</small>
                </td>
                <td data-label="반영 비중" className="breakdown__num">{weights[k]}%</td>
                <td data-label="매칭 점수에 반영" className="breakdown__num">
                  <strong>{((m.score * weights[k]) / 100).toFixed(2)}점</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!creator.hasHistory && (
        <details className="breakdown__note">
          <summary>캠페인 0건인데 항목 평가가 {campaignScore.toFixed(1)}점인 이유</summary>
          <p>
            캠페인 0건인 {stats.noHistoryCount}명을 공동 최하위로 함께 비교하면서, 그 동점 집단의 가운데 위치를 점수로 환산한 값입니다.
            실제 진행 건수는 0건입니다.
          </p>
        </details>
      )}
    </section>
  );
}
