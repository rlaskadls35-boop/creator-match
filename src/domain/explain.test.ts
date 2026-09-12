import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators } from './scoring';
import { strengthChips, cautions, metricBars, CAUTION_THRESHOLD } from './explain';

const scored = scoreCreators(parseCreators(csvText).creators);
const byId = (id: string) => scored.find((c) => c.id === id)!;

describe('strengthChips (설계 §5.8)', () => {
  it('정은매거진77: 항목 점수 상위 3개 = 비용·조회수·평점', () => {
    const chips = strengthChips(byId('C0077'));
    expect(chips.map((c) => c.key)).toEqual(['costPerView', 'views', 'rating']);
    expect(chips[0].text).toBe('조회 1회당 22원, 마이크로 상위 2%');
    expect(chips[1].text).toBe('평균 조회수 상위 4% (마이크로 기준)');
    expect(chips[2].text).toBe('광고주 평점 5.0, 전체 상위 5%');
  });
  it('신규 후보는 확인된 참여율·조회수 칩만 제공한다', () => {
    const chips = strengthChips(byId('C0036'));
    expect(chips).toHaveLength(2);
    expect(chips.map((c) => c.key).sort()).toEqual(['engagement', 'views']);
    expect(chips[0].text).toBe('참여율 상위 15% (마이크로 기준)');
  });
  it('캠페인 건수를 추천 강점 점수로 제시하지 않는다', () => {
    const chips = strengthChips(byId('C0180'));
    expect(chips.every((chip) => !chip.text.includes('캠페인'))).toBe(true);
  });
  it('상위 % 표시는 최소 1 (라이프뷰티181은 매크로 조회수 1등, 상위 0%)', () => {
    const chips = strengthChips(byId('C0181'));
    expect(chips[0].text).toBe('평균 조회수 상위 1% (매크로 기준)');
  });
});

describe('cautions (설계 §5.8)', () => {
  it(`항목 점수 ${CAUTION_THRESHOLD} 미만이면 유의점`, () => {
    expect(cautions(byId('C0180'))).toEqual([{ key: 'views', text: '평균 조회수는 마이크로 중 하위권입니다 (8,279)' }]);
    expect(cautions(byId('C0077'))).toEqual([]); // 참여율 25.4점은 유의점 기준 이상
  });
  it('여러 개면 모두, 항목 순서대로 (시우로그1: 조회수·비용)', () => {
    const c = cautions(byId('C0001'));
    expect(c.map((x) => x.key)).toEqual(['views', 'costPerView']);
    expect(c[0].text).toBe('평균 조회수는 마이크로 중 하위권입니다 (7,543)');
    expect(c[1].text).toBe('조회 1회당 평균 비용은 마이크로 중 하위권입니다 (231원)');
  });
  it('이력 없음은 건수 유의점을 넣지 않는다 (배지가 말함)', () => {
    expect(cautions(byId('C0036'))).toEqual([]);
    expect(cautions(byId('C0181')).map((x) => x.key)).toEqual([]); // 참여율 25.0은 미만이 아님
  });
});

describe('metricBars (설계 §5.8)', () => {
  it('4개, 항목 순서, 정수 점수, "{집단} {인원}명 중 {등수}등"', () => {
    const bars = metricBars(byId('C0180'));
    expect(bars.map((b) => b.key)).toEqual(['engagement', 'views', 'rating', 'costPerView']);
    expect(bars[1]).toEqual({ key: 'views', label: '평균 조회수', score: 18, rankText: '마이크로 72명 중 59등' });
    expect(bars[3].rankText).toBe('마이크로 61명 중 31등');
  });

  it('같은 값이 여러 명이면 공동 등수로 밝힌다 (L23)', () => {
    const bars = metricBars(byId('C0180'));
    // 민준브이로그180의 참여율 동점자는 나노로 이동했고 평점 동점자는 전체에서 비교한다.
    expect(bars[0]).toEqual({ key: 'engagement', label: '참여율', score: 69, rankText: '마이크로 72명 중 23등' });
    expect(bars[2]).toEqual({ key: 'rating', label: '광고주 평점', score: 71, rankText: '전체 173명 중 공동 46등' });
    expect(metricBars(byId('C0077'))[0]).toEqual({ key: 'engagement', label: '참여율', score: 25, rankText: '마이크로 72명 중 공동 52등' });
  });

  it('신규 후보는 평점·비용·건수 점수 막대를 표시하지 않는다', () => {
    const bars = metricBars(byId('C0036'));
    expect(bars.map((b) => b.key)).toEqual(['engagement', 'views']);
  });
});
