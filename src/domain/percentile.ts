export interface PercentileResult {
  score: number;
  topPercent: number;
  rank: number;
  groupSize: number;
  /** 같은 값이 한 명 이상 더 있으면 공동 등수 */
  tied: boolean;
  /** 본인을 제외한 동점자 수. 화면의 산정식에 실제 비교 인원을 표시한다. */
  tieCount: number;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * 상위 % = (나보다 좋은 사람 수 + 동점자 수 ÷ 2) ÷ (집단 인원 − 1) × 100
 * 항목 점수 = 100 − 상위 %   (집단 1명이면 50)
 * 등수 = 나보다 좋은 사람 수 + 1
 */
export function percentileRanks(values: number[], higherIsBetter: boolean): PercentileResult[] {
  const n = values.length;
  return values.map((v) => {
    let better = 0;
    let ties = -1; // 자기 자신 제외
    for (const o of values) {
      if (o === v) ties += 1;
      else if (higherIsBetter ? o > v : o < v) better += 1;
    }
    const topPercent = n <= 1 ? 50 : ((better + ties / 2) / (n - 1)) * 100;
    return { score: round1(100 - topPercent), topPercent, rank: better + 1, groupSize: n, tied: ties > 0, tieCount: ties };
  });
}

/** 화면 표시용 "상위 N%": 반올림, 최소 1 */
export function displayTopPercent(topPercent: number): number {
  return Math.max(1, Math.round(topPercent));
}
