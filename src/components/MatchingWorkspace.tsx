import { useMemo, useState } from 'react';
import type { DatasetStats, ScoredCreator, Weights } from '../domain/types';
import { rankCreators } from '../domain/scoring';
import { filterCandidates } from '../domain/recommend';
import type { SearchInput } from '../domain/recommend';
import { EMPTY_FORM, toSearchInput } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';
import { SearchPanel } from './SearchPanel';

interface Props {
  creators: ScoredCreator[];
  stats: DatasetStats;
  weights: Weights;
}

/** 광고주 화면과 운영자 화면이 공유하는 "입력 패널 + 결과" 블록. 비중만 다르게 받는다 */
export function MatchingWorkspace({ creators, weights }: Props) {
  const ranked = useMemo(() => rankCreators(creators, weights), [creators, weights]);
  const [form, setForm] = useState<SearchFormState>(EMPTY_FORM);
  const [query, setQuery] = useState<SearchInput | null>(null);
  const candidates = useMemo(() => (query ? filterCandidates(ranked, query) : []), [ranked, query]);

  const runSearch = (input: SearchInput) => setQuery(input);
  const handleSubmit = () => {
    const input = toSearchInput(form);
    if (input) runSearch(input);
  };

  return (
    <>
      <SearchPanel value={form} onChange={setForm} onSubmit={handleSubmit} />
      <section className="results">
        {query === null ? (
          <p className="results__empty">조건을 입력하고 크리에이터 찾기를 누르세요</p>
        ) : (
          <h2 className="results__title">섭외 가능한 크리에이터 {candidates.length}명</h2>
        )}
      </section>
    </>
  );
}
