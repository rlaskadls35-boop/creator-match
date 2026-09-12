import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { databaseBytes } from '../test/sqliteFixture';

beforeEach(() => {
  window.location.hash = '#/';
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(Uint8Array.from(databaseBytes)));
});
afterEach(() => vi.restoreAllMocks());

describe('광고주 화면 스모크 (설계 §8)', () => {
  it('조건을 입력해 검색하면 결과 표가 보이고 추천 이유를 펼칠 수 있다', async () => {
    window.location.hash = '#/';
    localStorage.clear();
    render(<App />);
    const user = userEvent.setup();

    expect(await screen.findByText('조건을 입력하고 크리에이터 찾기를 누르세요')).toBeInTheDocument();

    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '1500000');
    expect(screen.getByText('→ 150만 원')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('button', { name: '패션' }));
    await user.click(screen.getByRole('radio', { name: /마이크로/ }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));

    expect(screen.getByText('캠페인 이력이 있는 후보 15명')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('정은매거진77');
    expect(rows[1]).toHaveTextContent('72'); // 매칭 점수 72.6 → 73

    await user.click(screen.getByRole('button', { name: '정은매거진77 추천 이유 보기' }));
    expect(screen.getByText('왜 추천하나요?')).toBeInTheDocument();
    expect(screen.getByText('유의점: 참여율은 마이크로 중 하위권입니다 (6.5%)')).toBeInTheDocument();

    // 광고주 평점으로 정렬하면 순위 열 제목이 바뀌고 표가 평점 내림차순으로 다시 그려진다
    await user.click(screen.getByRole('button', { name: /^광고주 평점/ }));
    const experienced = screen.getByRole('table', { name: '캠페인 이력이 있는 후보' });
    expect(within(experienced).getByRole('columnheader', { name: '순위 (광고주 평점 기준)' })).toBeInTheDocument();
    const ratings = within(experienced)
      .getAllByRole('row')
      .map((row) => row.querySelector('[data-label="광고주 평점"]'))
      .filter((cell): cell is Element => cell !== null) // 머리글 줄과 펼친 설명 줄은 건너뛴다
      .map((cell) => Number(cell.textContent!.split('/')[0]));
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));

    await user.click(screen.getByRole('checkbox', { name: '캠페인 이력 있는 크리에이터만' }));
    expect(screen.getByText('캠페인 이력이 있는 후보 15명')).toBeInTheDocument();
  });
  it('로드 실패 안내에서 다시 시도하면 검색 화면으로 복구된다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
    expect(await screen.findByRole('alert')).toHaveTextContent('데이터를 불러오지 못했습니다');
    expect(screen.queryByRole('button', { name: '크리에이터 찾기' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('조건을 입력하고 크리에이터 찾기를 누르세요')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
