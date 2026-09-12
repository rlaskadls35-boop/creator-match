import { METRIC_KEYS } from '../domain/types';
import type { MetricKey, MetricScore, RankedCreator, Weights } from '../domain/types';
import { METRIC_LABEL } from '../domain/weights';
import { rankText } from '../domain/explain';
import { formatCostPerView, formatInt, formatPercent, formatRating } from '../domain/format';
import { Tooltip } from './Tooltip';

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

const FORMULA_HELP = '항목 점수 = 100 − [(나보다 좋은 수치의 인원 + 동점자 ÷ 2) ÷ (비교 인원 − 1) × 100]\n\n동점자는 본인을 제외합니다. 참여율·조회수·평점은 높을수록, 조회당 비용은 낮을수록 좋습니다.\n항목 점수는 소수 첫째 자리로 반올림합니다. 비교 집단이 1명이면 50점을 부여합니다.';

function metricFormula(m: MetricScore): string {
  if (m.groupSize <= 1) return '비교 집단이 1명이므로 50점';
  const better = m.rank - 1;
  return m.tieCount > 0
    ? `100 − [(${better} + ${m.tieCount} ÷ 2) ÷ ${m.groupSize - 1} × 100]`
    : `100 − (${better} ÷ ${m.groupSize - 1} × 100)`;
}

/** 소수 첫째 자리 항목 점수 × 정수 비중의 합이 정확히 맞도록 필요한 셋째 자리를 보존한다. */
function formatPoints(value: number): string {
  return value.toFixed(3).replace(/(\.\d{2})0$/, '$1');
}

/** 두 화면에서 매칭 점수가 어떻게 나온 값인지 항목별로 보여 준다. */
export function ScoreBreakdown({ creator, weights }: Props) {
  const contributions = METRIC_KEYS.map((k) => formatPoints((creator.metrics[k].score * weights[k]) / 100));
  return (
    <section className="breakdown" aria-label={`${creator.name} 매칭 점수 계산 내역`}>
      <div className="breakdown__head">
        <h3 className="breakdown__title">매칭 점수 계산 내역</h3>
        <span className="breakdown__total">
          합산 {formatPoints(creator.matchScore)}점 → 최종 <strong>{Math.round(creator.matchScore)}점</strong>
        </span>
      </div>
      <table className="breakdown__table">
        <thead>
          <tr>
            <th scope="col">평가 항목</th>
            <th scope="col">
              실제 수치 / 항목 점수 산정식
              <Tooltip text={FORMULA_HELP} label="항목 점수 산정식 설명" />
            </th>
            <th scope="col">항목 평가<br />(100점 만점)</th>
            <th scope="col">반영 비중</th>
            <th scope="col">매칭 점수에 반영</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_KEYS.map((k) => {
            const m = creator.metrics[k];
            return (
              <tr key={k}>
                <td className="breakdown__metric">{METRIC_LABEL[k]}</td>
                <td data-label="실제 수치 / 항목 점수 산정식" className="breakdown__basis">
                  <strong>{RAW_VALUE[k](creator)}</strong>
                  {k === 'costPerView' && (
                    <span className="breakdown__cost-basis"> · {formatInt(creator.rate)}원 ÷ {formatInt(creator.avgViewCount)}회</span>
                  )}
                  <small className="breakdown__formula">{metricFormula(m)}</small>
                </td>
                <td data-label="항목 평가 (100점 만점)" className="breakdown__num">
                  <strong>{m.score.toFixed(1)}점</strong>
                  <small>{rankText(m)}</small>
                </td>
                <td data-label="반영 비중" className="breakdown__num">× {weights[k]}%</td>
                <td data-label="매칭 점수에 반영" className="breakdown__num">
                  <strong>= {formatPoints((m.score * weights[k]) / 100)}점</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="breakdown__sum">
        <span>합산</span> {contributions.join(' + ')} = {formatPoints(creator.matchScore)}점 → <strong>{Math.round(creator.matchScore)}점</strong>
      </p>
      <p className="breakdown__note">캠페인 집행건수는 협업 경험을 참고하는 정보이며, 매칭 점수에 반영하지 않습니다.</p>
    </section>
  );
}
