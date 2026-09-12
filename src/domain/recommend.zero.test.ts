import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';
import { diagnoseZeroResult, buildRelaxations, nearCandidates, filterCandidates, FEW_RESULTS_THRESHOLD } from './recommend';
import type { SearchInput } from './recommend';

const ranked = rankCreators(scoreCreators(parseCreators(csvText).creators), DEFAULT_WEIGHTS);
const Q: SearchInput = { budget: 500_000, categories: ['뷰티'], tier: '매크로' };

describe('diagnoseZeroResult: 뷰티 / 매크로 / 50만 (설계 §5.7, §8.7)', () => {
  const info = diagnoseZeroResult(ranked, Q);

  it('후보가 정말 0명이다', () => {
    expect(filterCandidates(ranked, Q)).toHaveLength(0);
  });

  it('진단 문구: 4명 있지만 모두 예산 초과, 최저 단가 301만 원', () => {
    expect(info.diagnosis).toBe(
      '뷰티 카테고리의 매크로 크리에이터는 4명 있지만, 모두 단가가 예산 50만 원을 넘습니다. 가장 낮은 단가는 301만 원입니다.',
    );
    expect(info.extraNote).toBeNull(); // 50만으로 살 수 있는 사람이 다른 규모엔 있다
  });

  it('완화 버튼: 예산 301만 원 → 1명 / 나노 3명 / 마이크로 0명(비활성, 최저 단가 54만 원) / 카테고리 넓히기 0명(최저 224만 원)', () => {
    const byId = Object.fromEntries(info.relaxations.map((r) => [r.id, r]));
    expect(byId.budget.label).toBe('예산을 301만 원으로 올리면');
    expect(byId.budget.count).toBe(1);
    expect(byId.budget.enabled).toBe(true);
    expect(byId.budget.nextInput).toEqual({ ...Q, budget: 3_010_000 });

    expect(byId['tier-나노'].count).toBe(3);
    expect(byId['tier-나노'].enabled).toBe(true);
    expect(byId['tier-나노'].nextInput.tier).toBe('나노');

    expect(byId['tier-마이크로'].count).toBe(0);
    expect(byId['tier-마이크로'].enabled).toBe(false);
    expect(byId['tier-마이크로'].note).toBe('최저 단가 54만 원');

    expect(byId.category.count).toBe(0);
    expect(byId.category.enabled).toBe(false);
    expect(byId.category.note).toBe('최저 단가 224만 원');
    expect(byId.category.nextInput.categories).toHaveLength(10);
  });

  it('근접 후보 3명: 준그램40(예산), 라이프뷰티181(예산·예상 단가), 유나매거진115(규모)', () => {
    expect(info.nearCandidates).toHaveLength(3);
    expect(info.nearCandidates.map((n) => n.creator.id)).toEqual(['C0040', 'C0181', 'C0115']);
    expect(info.nearCandidates[0].change).toBe('예산을 658만 원 이상으로');
    expect(info.nearCandidates[1].change).toBe('예산을 472만 5,000원 이상으로');
    expect(info.nearCandidates[2].change).toBe('규모를 나노로');
  });
});

describe('diagnoseZeroResult: 그 밖의 경우', () => {
  it('극단 예산 5만 원: 전체 최저 단가 문구가 붙는다', () => {
    const info = diagnoseZeroResult(ranked, { ...Q, budget: 50_000 });
    expect(info.extraNote).toBe('전체 크리에이터의 최저 단가는 21만 원입니다.');
    expect(info.relaxations.find((r) => r.id === 'category')!.note).toBe('최저 단가 224만 원');
  });

  it('카테고리에 해당 규모가 없으면 문구가 달라지고 예산 버튼은 없다 (합성 데이터)', () => {
    const HEADER =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating';
    const rows = [
      'S1,나노뷰티,뷰티,유튜브,5000,1000,7.0,2,600000,300000,4.5',
      'S2,마이크로뷰티,뷰티,유튜브,50000,9000,6.0,5,5000000,1000000,4.0',
      'S3,매크로게임,게임,유튜브,200000,80000,5.0,10,40000000,4000000,4.8',
    ];
    const small = rankCreators(scoreCreators(parseCreators(HEADER + '\n' + rows.join('\n') + '\n').creators), DEFAULT_WEIGHTS);
    const info = diagnoseZeroResult(small, { budget: 5_000_000, categories: ['뷰티'], tier: '매크로' });
    expect(info.diagnosis).toBe('선택한 카테고리에는 매크로 크리에이터가 없습니다.');
    expect(info.relaxations.find((r) => r.id === 'budget')).toBeUndefined();
    expect(info.relaxations.find((r) => r.id === 'category')!.count).toBe(1); // 매크로게임
    expect(info.nearCandidates.map((n) => n.change)).toEqual(['카테고리에 게임 추가', '규모를 나노로', '규모를 마이크로로']); // 매칭 점수 65 / 45 / 40 순
  });

  it('예산 5만 원에서는 예산만 어긋난 뷰티·매크로 4명 중 상위 3명이 근접 후보가 된다', () => {
    const near = nearCandidates(ranked, { budget: 50_000, categories: ['뷰티'], tier: '매크로' });
    // 예산 5만 원은 아무도 못 맞추므로, 예산만 어긋난 사람 = 뷰티·매크로 4명
    expect(near.every((n) => n.change.startsWith('예산을'))).toBe(true);
    expect(near).toHaveLength(3);
  });
});

describe('buildRelaxations: 후보 1~2명 (설계 §5.7 마지막)', () => {
  it('뷰티 / 매크로 / 310만 → 후보 1명, 예산 제안은 다음 사람 472만 5,000원 → 2명', () => {
    const q: SearchInput = { budget: 3_100_000, categories: ['뷰티'], tier: '매크로' };
    const cands = filterCandidates(ranked, q);
    expect(cands).toHaveLength(1);
    expect(cands.length).toBeLessThan(FEW_RESULTS_THRESHOLD);
    const budget = buildRelaxations(ranked, q).find((r) => r.id === 'budget')!;
    expect(budget.label).toBe('예산을 472만 5,000원으로 올리면');
    expect(budget.count).toBe(2);
  });
});
