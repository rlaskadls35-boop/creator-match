import type { ScoredCreator } from '../domain/types';
import { strengthChips, cautions, metricBars } from '../domain/explain';

/** 펼침 행: 강점 칩 3개 + 유의점 + 항목 점수 막대 5개. 비중은 표시하지 않는다 (D10) */
export function ExplainRow({ creator }: { creator: ScoredCreator }) {
  const chips = strengthChips(creator);
  const notes = cautions(creator);
  const bars = metricBars(creator);
  return (
    <div className="explain">
      <h3 className="explain__title">왜 추천하나요?</h3>
      <ul className="chips">
        {chips.map((c) => (
          <li key={c.key} className="chip chip--positive">{c.text}</li>
        ))}
      </ul>
      {notes.length > 0 && (
        <ul className="cautions">
          {notes.map((n) => (
            <li key={n.key} className="caution">유의점: {n.text}</li>
          ))}
        </ul>
      )}
      <ul className="bars">
        {bars.map((b) => (
          <li key={b.key} className="bars__item">
            <span className="bars__label">{b.label}</span>
            <span className="bar"><span className="bar__fill" style={{ width: `${b.score}%` }} /></span>
            <span className="bars__score">{b.score}</span>
            <span className="bars__rank">{b.rankText}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
