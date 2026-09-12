import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators } from './scoring';
import { strengthChips, cautions, metricBars, CAUTION_THRESHOLD } from './explain';

const scored = scoreCreators(parseCreators(csvText).creators);
const byId = (id: string) => scored.find((c) => c.id === id)!;

describe('strengthChips (설계 §5.8)', () => {
  it('정은매거진77: 항목 점수 상위 3개 = 비용(99.2), 조회수(97.7), 평점(95.7)', () => {
    const chips = strengthChips(byId('C0077'));
    expect(chips.map((c) => c.key)).toEqual(['costPerView', 'views', 'rating']);
    expect(chips[0].text).toBe('조회 1회당 22원, 마이크로 상위 1%');
    expect(chips[1].text).toBe('평균 조회수 상위 2% (마이크로 기준)');
    expect(chips[2].text).toBe('광고주 평점 5.0, 전체 상위 4%');
  });
  it('이력 없음(지수챌린지36)은 평점·건수 칩을 뽑지 않는다', () => {
    const chips = strengthChips(byId('C0036'));
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.key).sort()).toEqual(['costPerView', 'engagement', 'views']);
    expect(chips[0].text).toBe('평균 조회수 상위 20% (마이크로 기준)'); // 80.5 > 78.1 > 77.0
  });
  it('캠페인 건수 칩 문구(민준브이로그180)', () => {
    const chips = strengthChips(byId('C0180'));
    expect(chips[0].text).toBe('캠페인 경험 28건, 전체 상위 6%');
  });
  it('상위 % 표시는 최소 1 (라이프뷰티181은 매크로 조회수 1등, 상위 0%)', () => {
    const chips = strengthChips(byId('C0181'));
    expect(chips[0].text).toBe('평균 조회수 상위 1% (매크로 기준)');
  });
});

describe('cautions (설계 §5.8)', () => {
  it(`항목 점수 ${CAUTION_THRESHOLD} 미만이면 유의점`, () => {
    expect(cautions(byId('C0077'))).toEqual([{ key: 'engagement', text: '참여율은 마이크로 중 하위권입니다 (6.5%)' }]);
  });
  it('여러 개면 모두, 항목 순서대로 (태호채널116: 조회수·평점·건수)', () => {
    const c = cautions(byId('C0116'));
    expect(c.map((x) => x.key)).toEqual(['views', 'rating', 'campaigns']);
    expect(c[0].text).toBe('평균 조회수는 마이크로 중 하위권입니다 (2,254)');
    expect(c[1].text).toBe('광고주 평점은 전체 중 하위권입니다 (4.0)');
    expect(c[2].text).toBe('캠페인 건수는 전체 중 하위권입니다 (1건)');
  });
  it('이력 없음은 건수 유의점을 넣지 않는다 (배지가 말함)', () => {
    expect(cautions(byId('C0036'))).toEqual([]);
    expect(cautions(byId('C0181')).map((x) => x.key)).toEqual([]); // 참여율 25.0은 미만이 아님
  });
});

describe('metricBars (설계 §5.8)', () => {
  it('5개, 항목 순서, 정수 점수, "{집단} {인원}명 중 {등수}등"', () => {
    const bars = metricBars(byId('C0180'));
    expect(bars.map((b) => b.key)).toEqual(['engagement', 'views', 'rating', 'costPerView', 'campaigns']);
    expect(bars[0]).toEqual({ key: 'engagement', label: '참여율', score: 59, rankText: '마이크로 129명 중 53등' });
    expect(bars[2]).toEqual({ key: 'rating', label: '광고주 평점', score: 75, rankText: '전체 200명 중 46등' });
    expect(bars[4].rankText).toBe('전체 200명 중 10등');
  });
});
