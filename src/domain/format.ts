const MAN = 10_000;

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

/** 예산·단가 전체 표기: 1,500,000 → "150만 원", 4,725,000 → "472만 5,000원", 8,000 → "8,000원" */
export function formatWon(n: number): string {
  const v = Math.round(n);
  if (v < MAN) return `${formatInt(v)}원`;
  const man = Math.floor(v / MAN);
  const rest = v % MAN;
  return rest === 0 ? `${formatInt(man)}만 원` : `${formatInt(man)}만 ${formatInt(rest)}원`;
}

/** 표 셀용 축약: 97,242 → "9.7만", 100,000 → "10만", 8,279 → "8,279" */
export function formatCompact(n: number): string {
  if (n < MAN) return formatInt(n);
  const man = n / MAN;
  const text = (Math.round(man * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return `${Number(text).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatRating(n: number): string {
  return n.toFixed(1);
}

/** 조회 1회당 평균 비용은 정수 원으로 (L21) */
export function formatCostPerView(n: number): string {
  return `${formatInt(n)}원`;
}
