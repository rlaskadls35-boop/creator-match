import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from './AdminPage';
import { loadDataset } from './dataset';
import { SESSION_KEY } from './session';

const data = loadDataset();

/** 제안서와 같은 조건: 1명당 50만 원 · 뷰티 · 나노 → 이력 후보 2명 */
async function searchThree(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '500000');
  await user.click(screen.getByRole('button', { name: '뷰티' }));
  await user.click(screen.getByRole('radio', { name: /나노/ }));
  await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
  expect(await screen.findByText('캠페인 이력이 있는 후보 2명')).toBeInTheDocument();
}

async function openWeights(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '비중 조절' }));
}

describe('운영자 비중 화면 (개선안 L23)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SESSION_KEY, '1');
  });

  it('크리에이터 찾기, 비중 조절, 결과 순서로 표시한다', () => {
    if (!data.ok) throw new Error('데이터 로드 실패');
    render(<AdminPage data={data} />);

    const searchButton = screen.getByRole('button', { name: '크리에이터 찾기' });
    const weightsTitle = screen.getByRole('heading', { name: '매칭 점수 비중 조절' });
    const resultsGuide = screen.getByText('조건을 입력하고 크리에이터 찾기를 누르세요');

    expect(searchButton.compareDocumentPosition(weightsTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weightsTitle.compareDocumentPosition(resultsGuide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('비중 상세 설정은 기본으로 접혀 있고 필요할 때 펼치고 다시 접을 수 있다', async () => {
    if (!data.ok) throw new Error('데이터 로드 실패');
    render(<AdminPage data={data} />);
    const user = userEvent.setup();

    expect(screen.queryByLabelText('참여율 비중 (%)')).not.toBeInTheDocument();
    await openWeights(user);
    expect(screen.getByLabelText('참여율 비중 (%)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: '접기' }));
    expect(screen.queryByLabelText('참여율 비중 (%)')).not.toBeInTheDocument();
  });

  it('합계가 100이 아닌 동안에는 미리보기가 멈추고, 100을 맞추면 갱신된다', async () => {
    if (!data.ok) throw new Error('데이터 로드 실패');
    render(<AdminPage data={data} />);
    const user = userEvent.setup();
    await searchThree(user);
    await openWeights(user);

    expect(screen.getByText('미리보기 조건')).toBeInTheDocument();
    expect(screen.getByText('저장된 기준')).toBeInTheDocument();
    expect(screen.getByText('저장된 비중으로 계산')).toBeInTheDocument();
    const before = screen.getAllByRole('row')[1].textContent;

    // 참여율 30 → 40 (합계 110)
    const engagement = screen.getByLabelText('참여율 비중 (%)');
    await user.clear(engagement);
    await user.type(engagement, '43');

    expect(screen.getByText('합계 110% / 100%')).toBeInTheDocument();
    expect(screen.getByText('10% 초과 · 비중을 낮춰 100%를 맞추세요.')).toBeInTheDocument();
    expect(screen.getByText('미리보기 갱신 대기 · 마지막 100% 기준의 결과')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '비중 저장' })).toBeDisabled();
    expect(screen.getAllByRole('row')[1].textContent).toBe(before); // 결과는 그대로

    // 평균 조회수 25 → 15 (합계 100)
    const views = screen.getByLabelText('평균 조회수 비중 (%)');
    await user.clear(views);
    await user.type(views, '18');

    expect(screen.getByText('합계 100% / 100%')).toBeInTheDocument();
    expect(screen.getByText('변경한 비중으로 미리보기 · 저장값과 비교')).toBeInTheDocument();
    expect(screen.getByText('저장하지 않은 변경')).toBeInTheDocument();
    expect(screen.getAllByRole('row')[1].textContent).not.toBe(before);
    expect(screen.getByRole('button', { name: '비중 저장' })).toBeEnabled();

    // 저장하면 다시 "저장된 기준"이 되고 저장값과의 차이가 사라진다
    await user.click(screen.getByRole('button', { name: '비중 저장' }));
    expect(screen.getByText('저장했습니다. 광고주 화면에 적용됩니다.')).toBeInTheDocument();
    expect(screen.getByText('저장된 기준')).toBeInTheDocument();
    expect(screen.getAllByText('저장값과 동일')).toHaveLength(2);
  });

  it('변경 취소를 누르면 입력과 미리보기가 저장된 값으로 돌아간다', async () => {
    if (!data.ok) throw new Error('데이터 로드 실패');
    render(<AdminPage data={data} />);
    const user = userEvent.setup();
    await searchThree(user);
    await openWeights(user);
    const before = screen.getAllByRole('row')[1].textContent;

    const engagement = screen.getByLabelText('참여율 비중 (%)');
    await user.clear(engagement);
    await user.type(engagement, '10');
    const campaigns = screen.getByLabelText('광고주 평점 비중 (%)');
    await user.clear(campaigns);
    await user.type(campaigns, '45');
    expect(screen.getAllByRole('row')[1].textContent).not.toBe(before);

    await user.click(screen.getByRole('button', { name: '변경 취소' }));
    expect(engagement).toHaveValue(33);
    expect(screen.getAllByRole('row')[1].textContent).toBe(before);
    expect(screen.getByRole('button', { name: '변경 취소' })).toBeDisabled();
  });

  it('계산 내역은 네 지표만 표시하고 신규 표는 비중 변경의 영향을 받지 않는다', async () => {
    if (!data.ok) throw new Error('데이터 로드 실패');
    render(<AdminPage data={data} />);
    const user = userEvent.setup();
    await searchThree(user);
    await openWeights(user);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
    expect(screen.queryByLabelText('캠페인 건수 비중 (%)')).not.toBeInTheDocument();
    const fresh = screen.getByRole('table', { name: '추가 확인이 필요한 신규 후보' });
    const before = fresh.textContent;
    await user.click(screen.getByRole('button', { name: '하은챌린지104 계산 내역 보기' }));
    const panel = screen.getByLabelText('하은챌린지104 매칭 점수 계산 내역');
    expect(within(panel).getAllByRole('row')).toHaveLength(5);
    expect(within(panel).queryByText(/예상 평점/)).not.toBeInTheDocument();
    expect(within(panel).getByText(/캠페인 집행건수는 협업 경험을 참고하는 정보/)).toBeInTheDocument();
    const engagement = screen.getByLabelText('참여율 비중 (%)');
    await user.clear(engagement);
    await user.type(engagement, '43');
    const views = screen.getByLabelText('평균 조회수 비중 (%)');
    await user.clear(views);
    await user.type(views, '18');
    expect(fresh.textContent).toBe(before);
  });
});
