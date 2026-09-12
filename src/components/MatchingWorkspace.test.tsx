import { databaseBytes } from '../test/sqliteFixture';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchingWorkspace } from './MatchingWorkspace';
import { loadDataset } from '../app/dataset';
import { DEFAULT_WEIGHTS } from '../domain/weights';

describe('후보 0명 화면 (L25)', () => {
  it('진단 문단과 조건 완화 버튼 없이 근접 후보 표만 보여 준다', async () => {
    const data = await loadDataset(databaseBytes);
    expect(data.ok).toBe(true);
    if (!data.ok) return;

    render(<MatchingWorkspace creators={data.creators} stats={data.stats} weights={DEFAULT_WEIGHTS} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '500000');
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('radio', { name: /매크로/ }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));

    expect(await screen.findByText('캠페인 이력이 있는 후보 0명')).toBeInTheDocument();
    expect(screen.getByText('조건에 가장 가까운 크리에이터')).toBeInTheDocument();
    expect(screen.getByText('준그램40')).toBeInTheDocument();

    expect(screen.queryByText('조건에 맞는 이력 있는 후보가 없습니다')).not.toBeInTheDocument();
    expect(screen.queryByText(/모두 단가가 예산/)).not.toBeInTheDocument();
    expect(screen.queryByText('조건을 바꿔 보시겠어요?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /바꾸면/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /올리면/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /넓히면/ })).not.toBeInTheDocument();
  });
});

describe('후보 1~2명일 때의 완화 버튼: 클릭 → 폼 반영 → 재검색 (최종 리뷰 지적 #7)', () => {
  it('예산 완화 버튼을 누르면 폼의 예산이 바뀌고 그 조건으로 다시 검색된다', async () => {
    const data = await loadDataset(databaseBytes);
    expect(data.ok).toBe(true);
    if (!data.ok) return;

    render(<MatchingWorkspace creators={data.creators} stats={data.stats} weights={DEFAULT_WEIGHTS} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '3100000');
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('radio', { name: /매크로/ }));
    await user.click(screen.getByRole('radio', { name: '이력 있는 후보만' }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));

    expect(await screen.findByText('캠페인 이력이 있는 후보 1명')).toBeInTheDocument();
    expect(screen.getByText('이력이 있는 후보가 적습니다. 조건을 넓히면 더 볼 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /캠페인 이력이 없는 후보/ })).not.toBeInTheDocument();

    // 아직 검색하지 않은 선택은 적용하지 않고, 완화 전 검색의 이력 조건을 유지한다.
    await user.click(within(screen.getByRole('radiogroup', { name: '캠페인 이력' })).getByRole('radio', { name: '전체' }));

    await user.click(screen.getByRole('button', { name: /예산을 658만 원으로 올리면/ }));

    expect(await screen.findByText('캠페인 이력이 있는 후보 2명')).toBeInTheDocument();
    expect(screen.getByLabelText('크리에이터 1명당 섭외 예산')).toHaveValue('6,580,000');
    expect(screen.getByRole('radio', { name: '이력 있는 후보만' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('heading', { name: /캠페인 이력이 없는 후보/ })).not.toBeInTheDocument();
  });
});


describe('기존 후보와 신규 후보 분리', () => {
  it('두 표를 분리하고 신규 후보에는 평점·단가·매칭 점수를 만들지 않는다', async () => {
    const data = await loadDataset(databaseBytes);
    if (!data.ok) throw new Error(data.message);
    render(<MatchingWorkspace creators={data.creators} stats={data.stats} weights={DEFAULT_WEIGHTS} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '1500000');
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('button', { name: '패션' }));
    await user.click(screen.getByRole('radio', { name: /마이크로/ }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
    const experienced = screen.getByRole('table', { name: '캠페인 이력이 있는 후보' });
    const fresh = screen.getByRole('table', { name: '캠페인 이력이 없는 후보' });
    expect(within(experienced).queryByText('지수챌린지36')).not.toBeInTheDocument();
    expect(within(fresh).getByText('지수챌린지36')).toBeInTheDocument();
    expect(within(fresh).queryByRole('columnheader', { name: '매칭 점수' })).not.toBeInTheDocument();
    expect(within(fresh).getAllByRole('columnheader').map((h) => h.getAttribute('aria-label') ?? h.textContent?.replace(/\s+/g, ' ').replace(/[▲▼↕]/g, '').trim()))
      .toEqual(['크리에이터', '플랫폼', '카테고리', '팔로워 수', '평균 조회수', '참여율']);
    expect(screen.queryByText('채널 지표로 살펴보기')).not.toBeInTheDocument();
    expect(screen.queryByText(/예상 평점/)).not.toBeInTheDocument();
    expect(screen.queryByText(/예상 4/)).not.toBeInTheDocument();
    const experiencedBefore = experienced.textContent;
    for (const [label, first] of [['평균 조회수', '지수챌린지36'], ['팔로워 수', '커버리지일상109'], ['참여율', '지수챌린지36']]) {
      const button = within(fresh).getByRole('button', { name: label });
      await user.click(button);
      expect(within(fresh).getByRole('columnheader', { name: label })).toHaveAttribute('aria-sort', 'descending');
      expect(within(fresh).getAllByRole('row')[1]).toHaveTextContent(first);
      await user.click(button);
      expect(within(fresh).getByRole('columnheader', { name: label })).toHaveAttribute('aria-sort', 'ascending');
      expect(within(fresh).getAllByRole('row')[1]).toHaveTextContent('라이프그램145');
    }
    expect(experienced.textContent).toBe(experiencedBefore);
    await user.click(screen.getByRole('radio', { name: '유튜브' }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
    expect(within(experienced).getAllByRole('row')).toHaveLength(4);
    expect(within(fresh).getAllByRole('row')).toHaveLength(2);
    expect(within(fresh).getByRole('columnheader', { name: '참여율' })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.queryByRole('checkbox', { name: '캠페인 이력 있는 크리에이터만' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '이력 있는 후보만' }));
    expect(fresh).toBeInTheDocument(); // 선택만 바꾸면 현재 결과를 유지한다.
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
    expect(screen.queryByRole('table', { name: '캠페인 이력이 없는 후보' })).not.toBeInTheDocument();
    expect(within(experienced).getAllByRole('row')).toHaveLength(4);

    await user.click(within(screen.getByRole('radiogroup', { name: '캠페인 이력' })).getByRole('radio', { name: '전체' }));
    expect(screen.queryByRole('table', { name: '캠페인 이력이 없는 후보' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
    expect(screen.getByRole('table', { name: '캠페인 이력이 없는 후보' })).toBeInTheDocument();
  });

  it('예산 내 기존 후보가 없어도 신규 후보는 예산 미확인 안내와 함께 표시된다', async () => {
    const data = await loadDataset(databaseBytes);
    if (!data.ok) throw new Error(data.message);
    render(<MatchingWorkspace creators={data.creators} stats={data.stats} weights={DEFAULT_WEIGHTS} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '1');
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('radio', { name: /나노/ }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
    expect(screen.getByText('캠페인 이력이 있는 후보 0명')).toBeInTheDocument();
    const fresh = screen.getByRole('table', { name: '캠페인 이력이 없는 후보' });
    expect(within(fresh).getByText('유나매거진115')).toBeInTheDocument();
    expect(screen.getByText(/단가 정보가 없어 예산 충족 여부는 별도 확인이 필요합니다/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '이력 있는 후보만' }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));
    expect(screen.getByText('캠페인 이력이 있는 후보 0명')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /캠페인 이력이 없는 후보/ })).not.toBeInTheDocument();
  });
});
