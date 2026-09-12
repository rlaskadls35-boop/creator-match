import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';
import { buildRelaxations, nearCandidates, filterCandidates, FEW_RESULTS_THRESHOLD } from './recommend';
import type { SearchInput } from './recommend';

const ranked = rankCreators(scoreCreators(parseCreators(csvText).creators), DEFAULT_WEIGHTS);
const Q: SearchInput = { platform: 'all', budget: 500_000, categories: ['뷰티'], tier: '매크로' };

describe('후보 0명: 근접 후보만 보여 준다 (L25)', () => {
  it('후보가 정말 0명이다', () => {
    expect(filterCandidates(ranked, Q)).toHaveLength(0);
  });

  it('근접 후보 3명: 준그램40(예산), 민준다이어리20(예산), 하은챌린지104(규모)', () => {
    const near = nearCandidates(ranked, Q);
    expect(near).toHaveLength(3);
    expect(near.map((n) => n.creator.id)).toEqual(['C0040', 'C0020', 'C0104']);
    expect(near[0].change).toBe('예산을 658만 원 이상으로');
    expect(near[1].change).toBe('예산을 301만 원 이상으로');
    expect(near[2].change).toBe('규모를 나노로');
  });

  it('예산 5만 원에서는 예산만 어긋난 뷰티·매크로 4명 중 상위 3명이 근접 후보가 된다', () => {
    const near = nearCandidates(ranked, { ...Q, budget: 50_000 });
    // 예산 5만 원은 아무도 못 맞추므로, 예산만 어긋난 사람 = 뷰티·매크로 4명
    expect(near.every((n) => n.change.startsWith('예산을'))).toBe(true);
    expect(near).toHaveLength(3);
  });

  it('합성 데이터: 조건이 각각 하나씩 어긋난 세 사람이 매칭 점수 순으로 나온다', () => {
    const HEADER =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating';
    const rows = [
      'S1,나노뷰티,뷰티,유튜브,5000,1000,7.0,2,600000,300000,4.5',
      'S2,마이크로뷰티,뷰티,유튜브,50000,9000,6.0,5,5000000,1000000,4.0',
      'S3,매크로게임,게임,유튜브,200000,80000,5.0,10,40000000,4000000,4.8',
    ];
    const small = rankCreators(scoreCreators(parseCreators(HEADER + '\n' + rows.join('\n') + '\n').creators), DEFAULT_WEIGHTS);
    const near = nearCandidates(small, { platform: 'all', budget: 5_000_000, categories: ['뷰티'], tier: '매크로' });
    expect(near.map((n) => n.change)).toEqual(['카테고리에 게임 추가', '규모를 나노로', '규모를 마이크로로']); // 매칭 점수 65 / 45 / 40 순
  });
});

describe('buildRelaxations: 후보 1~2명일 때만 쓴다 (설계 §5.7 마지막, L25)', () => {
  it('뷰티 / 매크로 / 310만 → 후보 1명, 예산 제안은 다음 사람 658만 원 → 2명', () => {
    const q: SearchInput = { platform: 'all', budget: 3_100_000, categories: ['뷰티'], tier: '매크로' };
    const cands = filterCandidates(ranked, q);
    expect(cands).toHaveLength(1);
    expect(cands.length).toBeLessThan(FEW_RESULTS_THRESHOLD);
    const byId = Object.fromEntries(buildRelaxations(ranked, q).map((r) => [r.id, r]));
    expect(byId.budget.label).toBe('예산을 658만 원으로 올리면');
    expect(byId.budget.count).toBe(2);
    expect(byId['tier-나노'].count).toBe(8);
    expect(byId['tier-나노'].enabled).toBe(true);
    expect(byId['tier-나노'].nextInput.tier).toBe('나노');
    expect(byId.category.nextInput.categories).toHaveLength(10);
  });
});

describe('플랫폼 조건 완화', () => {
  it('선택 플랫폼에 후보가 없으면 전체 플랫폼으로 넓히는 선택지와 근접 후보를 제시한다', () => {
    const HEADER =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating';
    const row = 'P1,유튜브나노,뷰티,유튜브,5000,1000,7.0,2,600000,300000,4.5';
    const small = rankCreators(scoreCreators(parseCreators(`${HEADER}\n${row}\n`).creators), DEFAULT_WEIGHTS);
    const q: SearchInput = { platform: '인스타그램', budget: 500_000, categories: ['뷰티'], tier: '나노' };
    const platform = buildRelaxations(small, q).find((r) => r.id === 'platform')!;

    expect(platform.label).toBe('플랫폼을 전체로 넓히면');
    expect(platform.count).toBe(1);
    expect(platform.nextInput.platform).toBe('all');
    expect(nearCandidates(small, q)[0].change).toBe('플랫폼을 유튜브로');
  });
});
