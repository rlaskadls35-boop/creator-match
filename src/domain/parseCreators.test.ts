import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators, CsvHeaderError } from './parseCreators';

const HEADER =
  'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating';

function row(over: Partial<Record<string, string>> = {}): string {
  const base: Record<string, string> = {
    creator_id: 'T001', creator_name: '테스트1', category: '뷰티', platform: '유튜브',
    followers: '50000', avg_view_count: '8000', engagement_rate: '7.0', total_campaign_count: '3',
    total_campaign_budget_krw: '3000000', avg_campaign_budget_krw: '1000000', advertiser_rating: '4.5',
  };
  return Object.values({ ...base, ...over }).join(',');
}

describe('parseCreators (설계 §3.3, §3.4)', () => {
  it('BOM이 있어도 첫 컬럼이 creator_id로 읽힌다', () => {
    const ds = parseCreators('﻿' + HEADER + '\r\n' + row() + '\r\n');
    expect(ds.creators).toHaveLength(1);
    expect(ds.creators[0].id).toBe('T001');
  });

  it('CRLF와 LF를 모두 처리한다', () => {
    const crlf = parseCreators(HEADER + '\r\n' + row() + '\r\n' + row({ creator_id: 'T002', creator_name: '테스트2' }) + '\r\n');
    const lf = parseCreators(HEADER + '\n' + row() + '\n' + row({ creator_id: 'T002', creator_name: '테스트2' }) + '\n');
    expect(crlf.creators.map((c) => c.id)).toEqual(['T001', 'T002']);
    expect(lf.creators.map((c) => c.id)).toEqual(['T001', 'T002']);
  });

  it('헤더가 다르면 CsvHeaderError', () => {
    expect(() => parseCreators('id,name\n1,2\n')).toThrow(CsvHeaderError);
  });

  it('숫자 칸에 문자가 있는 행은 건너뛰고 카운트된다', () => {
    const ds = parseCreators(HEADER + '\n' + row() + '\n' + row({ creator_id: 'T002', followers: 'abc' }) + '\n');
    expect(ds.creators).toHaveLength(1);
    expect(ds.stats.skippedRows).toBe(1);
  });

  it('카테고리·플랫폼이 목록 밖이거나 평점이 0~5 밖이면 건너뛴다', () => {
    const ds = parseCreators(
      HEADER + '\n' + row() + '\n' +
      row({ creator_id: 'T002', category: '요리' }) + '\n' +
      row({ creator_id: 'T003', platform: '틱톡' }) + '\n' +
      row({ creator_id: 'T004', advertiser_rating: '7' }) + '\n',
    );
    expect(ds.creators).toHaveLength(1);
    expect(ds.stats.skippedRows).toBe(3);
  });

  it('신규 후보의 평점·단가·조회당 비용은 채우지 않고 null로 유지한다', () => {
    const ds = parseCreators(
      HEADER + '\n' +
      row({ advertiser_rating: '4.0', avg_campaign_budget_krw: '1000000' }) + '\n' +
      row({ creator_id: 'T002', advertiser_rating: '5.0', avg_campaign_budget_krw: '1400000' }) + '\n' +
      row({ creator_id: 'T003', total_campaign_count: '0', total_campaign_budget_krw: '0', avg_campaign_budget_krw: '0', advertiser_rating: '' }) + '\n',
    );
    const fresh = ds.creators.find((c) => c.id === 'T003')!;
    expect(fresh.advertiserRating).toBeNull();
    expect(fresh.hasHistory).toBe(false);
    expect(fresh.rating).toBeNull();
    expect(fresh.rate).toBeNull();
    expect(ds.stats.medianRateByTier.마이크로).toBe(1_200_000);
    expect(fresh.costPerView).toBeNull();
  });
});

describe('parseCreators 실제 데이터', () => {
  const ds = parseCreators(csvText);

  it('200명 로드, 건너뛴 행 0', () => {
    expect(ds.creators).toHaveLength(200);
    expect(ds.stats.total).toBe(200);
    expect(ds.stats.skippedRows).toBe(0);
  });

  it('평점 공란 27명 = 캠페인 0건 27명 = 이력 없음 27명', () => {
    const nullRating = ds.creators.filter((c) => c.advertiserRating === null);
    const zeroCount = ds.creators.filter((c) => c.totalCampaignCount === 0);
    expect(nullRating).toHaveLength(27);
    expect(zeroCount).toHaveLength(27);
    expect(new Set(nullRating.map((c) => c.id))).toEqual(new Set(zeroCount.map((c) => c.id)));
    expect(ds.stats.noHistoryCount).toBe(27);
    expect(ds.stats.ratedCount).toBe(173);
  });

  it('규모 구간 인원 101 / 72 / 27', () => {
    const count = (t: string) => ds.creators.filter((c) => c.tier === t).length;
    expect(count('나노')).toBe(101);
    expect(count('마이크로')).toBe(72);
    expect(count('매크로')).toBe(27);
  });

  it('규모별 단가 통계는 참고값으로만 보관하고 신규 개인 값에 적용하지 않는다', () => {
    expect(ds.stats.medianRateByTier).toEqual({ 나노: 700_000, 마이크로: 1_320_000, 매크로: 4_725_000 });
    expect(ds.stats.ratingAverage).toBeCloseTo(4.42, 2);
    const fresh = ds.creators.find((c) => c.id === 'C0036')!; // 지수챌린지36, 마이크로, 이력 없음
    expect(fresh.rate).toBeNull();
    expect(fresh.rating).toBeNull();
  });

  it('costPerView = rate ÷ avg_view_count (민준브이로그180: 700,000 ÷ 8,279)', () => {
    const c = ds.creators.find((x) => x.id === 'C0180')!;
    expect(c.rate).toBe(700_000);
    expect(c.avgViewCount).toBe(8_279);
    expect(c.costPerView).toBeCloseTo(700_000 / 8_279, 6);
  });
});
