import { METRIC_KEYS } from '../domain/types';
import type { MetricKey, RankedCreator, Weights } from '../domain/types';
import { METRIC_LABEL } from '../domain/weights';
import { rankText } from '../domain/explain';
import { formatCostPerView, formatInt, formatPercent, formatRating, formatWon } from '../domain/format';

interface Props {
  creator: RankedCreator;
  weights: Weights;
}

/** 항목별 "실제 수치" 칸 */
const RAW_VALUE: Record<MetricKey, (c: RankedCreator) => string> = {
  engagement: (c) => formatPercent(c.engagementRate),
  views: (c) => `${formatInt(c.avgViewCount)}회`,
  rating: (c) => `${formatRating(c.rating)} / 5점`,
  costPerView: (c) => `${formatCostPerView(c.costPerView)} / 회`,
};

/** 실제 수치와 계산에 쓴 값이 다를 때만 덧붙이는 한 줄 */
const BASIS: Partial<Record<MetricKey, (c: RankedCreator) => string | null>> = {
  costPerView: (c) => `평균 단가 ${formatWon(c.rate)} ÷ ${formatInt(c.avgViewCount)}회`,
};

/** 운영자 화면 펼침: 매칭 점수가 어떻게 나온 값인지 항목별로 보여 준다 (L23) */
export function ScoreBreakdown({ creator, weights }: Props) {
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
            return (
              <tr key={k}>
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
      <p className="breakdown__note">캠페인 집행건수는 협업 경험을 참고하는 정보이며, 매칭 점수에 반영하지 않습니다.</p>
    </section>
  );
}
