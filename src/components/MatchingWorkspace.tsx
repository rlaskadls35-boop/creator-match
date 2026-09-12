import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DatasetStats, ScoredCreator, Weights } from '../domain/types';
import { matchScore, rankCreators } from '../domain/scoring';
import { filterCandidates, sortCandidates, applyResultFilters, DEFAULT_SORT, DEFAULT_FILTERS, SORT_DEFAULT_DIRECTION, filterNewCandidates, sortNewCandidates } from '../domain/recommend';
import type { SearchInput, SortKey, SortState, ResultFilters, NewCandidateSortKey } from '../domain/recommend';
import { nearCandidates, buildRelaxations, FEW_RESULTS_THRESHOLD } from '../domain/recommend';
import { EMPTY_FORM, toSearchInput } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';
import { fromSearchInput } from '../domain/searchForm';
import { SearchPanel } from './SearchPanel';
import { ResultsToolbar } from './ResultsToolbar';
import { ResultsTable } from './ResultsTable';
import { NewCandidatesTable } from './NewCandidatesTable';
import { NearCandidatesTable } from './NearCandidatesTable';
import { RelaxationList } from './RelaxationList';
import { ConditionSummary } from './ConditionSummary';

interface Props {
  creators: ScoredCreator[];
  stats: DatasetStats;
  weights: Weights;
  variant?: 'advertiser' | 'admin';
  /** 운영자 화면에서 저장된 비중 — 미리보기와 비교해 점수·순위 변화를 보여 준다 */
  savedWeights?: Weights;
  /** 운영자 화면 결과 줄에 붙는 미리보기 상태 문구 */
  previewNote?: { text: string; waiting: boolean };
  /** 검색 조건과 결과 사이에 배치할 운영자 전용 설정 UI */
  afterSearchPanel?: ReactNode;
}

/** 광고주 화면과 운영자 화면이 공유하는 "입력 패널 + 결과" 블록. 비중만 다르게 받는다 */
export function MatchingWorkspace({ creators, stats, weights, variant = 'advertiser', savedWeights, previewNote, afterSearchPanel }: Props) {
  const admin = variant === 'admin';
  const ranked = useMemo(() => rankCreators(creators, weights), [creators, weights]);
  const [form, setForm] = useState<SearchFormState>(EMPTY_FORM);
  const [query, setQuery] = useState<SearchInput | null>(null);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);
  const [newSort, setNewSort] = useState<NewCandidateSortKey>('engagement');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const candidates = useMemo(() => (query ? filterCandidates(ranked, query) : []), [ranked, query]);
  const visible = useMemo(() => sortCandidates(applyResultFilters(candidates, filters), sort), [candidates, filters, sort]);
  const newCandidates = useMemo(() => query ? filterNewCandidates(creators, query) : [], [creators, query]);
  const visibleNew = useMemo(() => sortNewCandidates(applyResultFilters(newCandidates, filters), newSort), [newCandidates, filters, newSort]);
  // 0명 판정은 결과 필터(플랫폼·이력) 적용 전 인원으로 (설계 §5.1)
  const isZero = query !== null && candidates.length === 0;
  // 후보 0명일 때는 조건 하나만 다른 근접 후보만 보여 준다 (L25: 진단 문단·완화 버튼 제거)
  const near = useMemo(() => (query && isZero ? nearCandidates(ranked, query) : []), [ranked, query, isZero]);
  const fewRelaxations = useMemo(
    () => (query && candidates.length > 0 && candidates.length < FEW_RESULTS_THRESHOLD ? buildRelaxations(ranked, query) : null),
    [ranked, query, candidates],
  );

  // 저장된 비중으로 계산한 점수·순위 (운영자 화면 비교용, L23)
  const savedScoreById = useMemo(() => {
    if (!admin || !savedWeights) return null;
    return new Map(ranked.map((c) => [c.id, matchScore(c, savedWeights)]));
  }, [admin, savedWeights, ranked]);
  // 순위 비교는 매칭 점수 내림차순으로 볼 때만 뜻이 있다
  const priorRankById = useMemo(() => {
    if (!savedScoreById || sort.key !== 'match' || sort.direction !== 'desc') return null;
    const ordered = [...visible].sort((a, b) => {
      const d = (savedScoreById.get(b.id) ?? 0) - (savedScoreById.get(a.id) ?? 0);
      if (d !== 0) return d;
      if (b.engagementRate !== a.engagementRate) return b.engagementRate - a.engagementRate;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return new Map(ordered.map((c, i) => [c.id, i + 1]));
  }, [savedScoreById, visible, sort]);

  const runSearch = (input: SearchInput) => {
    setQuery(input);
    setSort(DEFAULT_SORT);
    setFilters(DEFAULT_FILTERS);
    setExpandedId(null);
    setNewSort('engagement');
  };
  const handleSubmit = () => {
    const input = toSearchInput(form);
    if (input) runSearch(input);
  };
  const handleRelax = (next: SearchInput) => {
    setForm(fromSearchInput(next)); // 폼에도 바뀐 값 반영 (설계 §6.2)
    runSearch(next);
  };
  const handleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: SORT_DEFAULT_DIRECTION[key] }));
  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <>
      <SearchPanel value={form} onChange={setForm} onSubmit={handleSubmit} />
      {afterSearchPanel}
      {admin && query && <ConditionSummary input={query} note={previewNote} />}
      <section className="results">
        {query === null ? (
          <p className="results__empty">조건을 입력하고 크리에이터 찾기를 누르세요</p>
        ) : (
          <>
            <ResultsToolbar count={visible.length} filters={filters} onChange={setFilters} sort={sort} onSortChange={handleSort} />
            <p className="results__context">과거 평균 단가가 입력 예산 이내인 후보입니다. 캠페인 건수는 참고 정보로 표시합니다.</p>
            {isZero ? (
              near.length > 0 ? (
                <NearCandidatesTable items={near} stats={stats} />
              ) : (
                <p className="results__empty">조건에 가까운 크리에이터도 없습니다. 예산·규모·카테고리를 바꿔 다시 찾아 보세요.</p>
              )
            ) : visible.length === 0 ? (
              <p className="results__empty">선택한 필터에 맞는 크리에이터가 없습니다. 필터를 풀어 보세요.</p>
            ) : (
              <ResultsTable
                rows={visible}
                sort={sort}
                onSortChange={handleSort}
                stats={stats}
                expandedId={expandedId}
                onToggleExpand={toggleExpand}
                variant={variant}
                weights={weights}
                savedScoreById={savedScoreById}
                priorRankById={priorRankById}
              />
            )}
            {!filters.historyOnly && <NewCandidatesTable rows={visibleNew} stats={stats} sortKey={newSort} onSortChange={setNewSort} />}
            {fewRelaxations && (
              <RelaxationList compact title="이력이 있는 후보가 적습니다. 조건을 넓히면 더 볼 수 있습니다." items={fewRelaxations} onRelax={handleRelax} />
            )}
          </>
        )}
      </section>
    </>
  );
}
