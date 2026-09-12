import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPanel } from './SearchPanel';
import { EMPTY_FORM } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';

/** SearchPanel은 controlled 컴포넌트라 실제 부모처럼 상태를 들고 있는 래퍼로 렌더링한다 */
function Harness() {
  const [form, setForm] = useState<SearchFormState>(EMPTY_FORM);
  return <SearchPanel value={form} onChange={setForm} onSubmit={() => {}} />;
}

describe('SearchPanel 예산 입력 커서 (Task 12 리뷰 수정 #1)', () => {
  it('콤마 재포맷 중에도 커서가 방금 입력한 자리 뒤에 머문다', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('크리에이터 1명당 섭외 예산') as HTMLInputElement;

    await user.type(input, '1500000');
    expect(input.value).toBe('1,500,000');

    // "1,500,000"에서 "1," 바로 뒤(인덱스 2)로 커서를 옮기고 "9"를 끼워 넣는다.
    // user-event는 raw DOM setSelectionRange를 추적하지 못하므로 type()의
    // initialSelectionStart/End 옵션으로 커서 위치를 지정한다.
    await user.type(input, '9', { initialSelectionStart: 2, initialSelectionEnd: 2 });

    expect(input.value).toBe('19,500,000');
    expect(input.selectionStart).toBe(3);
  });
});

describe('SearchPanel 크리에이터 규모 카드', () => {
  it('규모명과 팔로워 범위만 표시한다', () => {
    render(<Harness />);

    expect(screen.getByText('1만 미만')).toBeInTheDocument();
    expect(screen.getByText('1만~10만')).toBeInTheDocument();
    expect(screen.getByText('10만 이상')).toBeInTheDocument();
    expect(screen.queryByText('팬과 가까운 채널')).not.toBeInTheDocument();
    expect(screen.queryByText('반응과 도달의 균형')).not.toBeInTheDocument();
    expect(screen.queryByText('넓은 도달')).not.toBeInTheDocument();
    expect(screen.queryByText(/단가/)).not.toBeInTheDocument();
  });
});

describe('SearchPanel 플랫폼 검색 조건', () => {
  it('전체가 기본값이고 유튜브를 검색 전에 선택할 수 있다', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: '전체' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: '유튜브' }));
    expect(screen.getByRole('radio', { name: '유튜브' })).toHaveAttribute('aria-checked', 'true');
  });
});
