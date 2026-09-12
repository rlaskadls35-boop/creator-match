import { METRIC_KEYS } from '../domain/types';
import type { Weights } from '../domain/types';
import { METRIC_LABEL, sumWeights } from '../domain/weights';

interface Props {
  draft: Weights;
  onChange: (w: Weights) => void;
  onSave: () => void;
  onReset: () => void;
  message: { kind: 'success' | 'error'; text: string } | null;
}

/** 비중 조절 카드 (설계 §6.4 2, D23) */
export function WeightsCard({ draft, onChange, onSave, onReset, message }: Props) {
  const sum = sumWeights(draft);
  const ok = sum === 100;
  return (
    <section className="card weights">
      <div className="weights__head">
        <div>
          <h2 className="weights__title">매칭 점수 비중 조절</h2>
          <p className="weights__desc">슬라이더를 움직이면 아래 결과가 바로 바뀝니다. 저장하면 광고주 화면에 적용됩니다.</p>
        </div>
        <div className={`weights__sum${ok ? ' is-ok' : ' is-bad'}`} aria-live="polite">
          합계 {sum} {ok ? '✓' : '✕'}
          {!ok && <span className="weights__sum-help">합계가 100이어야 저장할 수 있습니다</span>}
        </div>
      </div>
      <div className="weights__grid">
        {METRIC_KEYS.map((k) => (
          <label key={k} className="slider">
            <span className="slider__label">{METRIC_LABEL[k]}</span>
            <input type="range" min={0} max={100} step={1} value={draft[k]} onChange={(e) => onChange({ ...draft, [k]: Number(e.target.value) })} />
            <span className="slider__value">{draft[k]}</span>
          </label>
        ))}
      </div>
      <p className="weights__warning">한 항목에 60 이상을 몰면 추천 이유와 순위가 어긋날 수 있습니다.</p>
      <div className="weights__actions">
        <button type="button" className="btn btn--primary" disabled={!ok} onClick={onSave}>저장</button>
        <button type="button" className="btn" onClick={onReset}>기본값으로 되돌리기</button>
        {message && (
          <span className={`weights__message weights__message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            {message.text}
          </span>
        )}
      </div>
    </section>
  );
}
