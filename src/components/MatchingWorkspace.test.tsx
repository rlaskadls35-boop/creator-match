import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchingWorkspace } from './MatchingWorkspace';
import { loadDataset } from '../app/dataset';
import { DEFAULT_WEIGHTS } from '../domain/weights';

describe('MatchingWorkspace: 완화 버튼 클릭 → 폼 반영 → 재검색 (최종 리뷰 지적 #7)', () => {
  it('근접 후보 완화 버튼을 누르면 폼의 규모가 바뀌고 그 조건으로 다시 검색된다', async () => {
    const data = loadDataset();
    expect(data.ok).toBe(true);
    if (!data.ok) return;

    render(<MatchingWorkspace creators={data.creators} stats={data.stats} weights={DEFAULT_WEIGHTS} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '500000');
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('radio', { name: /매크로/ }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));

    expect(await screen.findByText('조건에 맞는 크리에이터가 없습니다')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /규모를 나노로 바꾸면/ }));

    expect(await screen.findByText('섭외 가능한 크리에이터 3명')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /나노/ })).toHaveAttribute('aria-checked', 'true');
  });
});
