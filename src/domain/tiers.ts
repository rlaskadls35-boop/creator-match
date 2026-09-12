import type { Tier } from './types';

// 과제 데이터에서 비슷한 규모끼리 비교하기 위한 자체 기준. 업계 공통 기준이 아니다.
export const TIER_BOUNDS = { micro: 15_000, macro: 100_000 } as const;

export function tierOf(followers: number): Tier {
  if (followers < TIER_BOUNDS.micro) return '나노';
  if (followers < TIER_BOUNDS.macro) return '마이크로';
  return '매크로';
}

/** 규모 카드 문구 (설계 §4 "규모 선택지") */
export const TIER_INFO: Record<Tier, { range: string; trait: string; rateRange: string }> = {
  나노: { range: '1.5만 미만', trait: '팬과 가까운 채널', rateRange: '단가 21만~196만 원대' },
  마이크로: { range: '1.5만 이상~10만 미만', trait: '반응과 도달의 균형', rateRange: '단가 52만~200만 원대' },
  매크로: { range: '10만 이상', trait: '넓은 도달', rateRange: '단가 224만 원 이상' },
};
