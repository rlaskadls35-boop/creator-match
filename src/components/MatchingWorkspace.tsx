import { useMemo, useState } from 'react';
import type { DatasetStats, ScoredCreator, Weights } from '../domain/types';
import { rankCreators } from '../domain/scoring';
import { filterCandidates, sortCandidates, applyResultFilters, DEFAULT_SORT, DEFAULT_FILTERS, SORT_DEFAULT_DIRECTION } from '../domain/recommend';
import type { SearchInput, SortKey, SortState, ResultFilters } from '../domain/recommend';
import { EMPTY_FORM, toSearchInput } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';
import { SearchPanel } from './SearchPanel';
import { ResultsToolbar } from './ResultsToolbar';
import { ResultsTable } from './ResultsTable';

interface Props {
  creators: ScoredCreator[];
  stats: DatasetStats;
  weights: Weights;
}

/** 광고주 화면과 운영자 화면이 공유하는 "입력 패널 + 결과" 블록. 비중만 다르게 받는다 */
export function MatchingWorkspace({ creators, stats, weights }: Props) {
  const ranked = useMemo(() => rankCreators(creators, weights), [creators, weights]);
  const [form, setForm] = useState<SearchFormState>(EMPTY_FORM);
  const [query, setQuery] = useState<SearchInput | null>(null);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const candidates = useMemo(() => (query ? filterCandidates(ranked, query) : []), [ranked, query]);
  const visible = useMemo(() => sortCandidates(applyResultFilters(candidates, filters), sort), [candidates, filters, sort]);

  const runSearch = (input: SearchInput) => {
    setQuery(input);
    setSort(DEFAULT_SORT);
    setFilters(DEFAULT_FILTERS);
    setExpandedId(null);
  };
  const handleSubmit = () => {
    const input = toSearchInput(form);
    if (input) runSearch(input);
  };
  const handleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: SORT_DEFAULT_DIRECTION[key] }));
  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <>
      <SearchPanel value={form} onChange={setForm} onSubmit={handleSubmit} />
      <section className="results">
        {query === null ? (
          <p className="results__empty">조건을 입력하고 크리에이터 찾기를 누르세요</p>
        ) : candidates.length === 0 ? (
          <p className="results__empty">조건에 맞는 크리에이터가 없습니다</p>
        ) : (
          <>
            <ResultsToolbar count={visible.length} filters={filters} onChange={setFilters} />
            {visible.length === 0 ? (
              <p className="results__empty">선택한 필터에 맞는 크리에이터가 없습니다. 필터를 풀어 보세요.</p>
            ) : (
              <ResultsTable rows={visible} sort={sort} onSortChange={handleSort} stats={stats} expandedId={expandedId} onToggleExpand={toggleExpand} />
            )}
          </>
        )}
      </section>
    </>
  );
}
