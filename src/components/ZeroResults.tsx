import type { SearchInput, ZeroResultInfo } from '../domain/recommend';
import type { DatasetStats } from '../domain/types';
import { RelaxationList } from './RelaxationList';
import { NearCandidatesTable } from './NearCandidatesTable';

/** 후보 0명: 원인 진단 → 완화 버튼 → 근접 후보 (설계 §5.7, D16) */
export function ZeroResults({ info, stats, onRelax }: { info: ZeroResultInfo; stats: DatasetStats; onRelax: (next: SearchInput) => void }) {
  return (
    <div className="zero">
      <section className="card zero__diagnosis">
        <h2 className="zero__title">조건에 맞는 이력 있는 후보가 없습니다</h2>
        <p className="zero__text">{info.diagnosis}{info.extraNote ? ` ${info.extraNote}` : ''}</p>
      </section>
      <RelaxationList title="조건을 바꿔 보시겠어요?" items={info.relaxations} onRelax={onRelax} />
      {info.nearCandidates.length > 0 && <NearCandidatesTable items={info.nearCandidates} stats={stats} />}
    </div>
  );
}
