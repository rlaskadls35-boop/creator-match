import type { Relaxation, SearchInput } from '../domain/recommend';

interface Props {
  title: string;
  items: Relaxation[];
  onRelax: (next: SearchInput) => void;
  compact?: boolean;
}

/** 조건 완화 버튼 묶음. 누르면 그 조건으로 즉시 재검색. 자동 완화는 절대 없다 (설계 §5.7) */
export function RelaxationList({ title, items, onRelax, compact = false }: Props) {
  return (
    <section className={`relax${compact ? ' relax--compact' : ''}`}>
      <h3 className="relax__title">{title}</h3>
      <ul className="relax__list">
        {items.map((r) => (
          <li key={r.id}>
            <button type="button" className="relax__btn" disabled={!r.enabled} onClick={() => onRelax(r.nextInput)}>
              <span>{r.label} → <strong>{r.count}명</strong></span>
              {r.note && <span className="relax__note">· {r.note}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
