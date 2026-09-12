import { METRIC_KEYS } from '../domain/types';
import type { MetricKey, Weights } from '../domain/types';
import type { WeightsDraft } from '../domain/weights';
import { METRIC_HINT, METRIC_LABEL, draftEquals, draftInRange, draftSum, draftToWeights } from '../domain/weights';

interface Props {
  draft: WeightsDraft;
  saved: Weights;
  onChange: (d: WeightsDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDefault: () => void;
  message: { kind: 'success' | 'error'; text: string } | null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** 비중 조절 카드 (설계 §6.4 2, D23 / 개선안 L23) */
export function WeightsCard({ draft, saved, onChange, onSave, onCancel, onDefault, message }: Props) {
  const sum = draftSum(draft);
  const inRange = draftInRange(draft);
  const ok = draftToWeights(draft) !== null;
  const same = draftEquals(draft, saved);

  const help = !inRange
    ? '각 비중을 0~100 사이의 정수로 입력하세요.'
    : ok
      ? '현재 비중으로 결과를 확인할 수 있습니다.'
      : sum > 100
        ? `${sum - 100}% 초과 · 비중을 낮춰 100%를 맞추세요.`
        : `${100 - sum}% 남음 · 비중을 더 배분하세요.`;

  const set = (k: MetricKey, value: number | null) => onChange({ ...draft, [k]: value });
  const step = (k: MetricKey, by: number) => set(k, clamp((draft[k] ?? 0) + by));

  return (
    <section className="card weights">
      <div className="weights__head">
        <div>
          <h2 className="weights__title">매칭 점수 비중 조절</h2>
          <p className="weights__desc">합계 100%를 맞추면 아래 미리보기가 갱신됩니다. 저장하면 광고주 화면에 적용됩니다.</p>
        </div>
        <span className="weights__state">{same ? '저장된 기준' : '저장하지 않은 변경'}</span>
      </div>

      <div className="weights__grid">
        {METRIC_KEYS.map((k) => {
          const value = draft[k];
          const invalid = value === null || !Number.isInteger(value) || value < 0 || value > 100;
          return (
            <div key={k} className="weight">
              <label className="weight__label" htmlFor={`weight-${k}`}>{METRIC_LABEL[k]}</label>
              <div className="weight__number">
                <button type="button" className="weight__step" disabled={value === 0} aria-label={`${METRIC_LABEL[k]} 비중 1 줄이기`} onClick={() => step(k, -1)}>−</button>
                <span className="weight__entry">
                  <input
                    id={`weight-${k}`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`${METRIC_LABEL[k]} 비중 (%)`}
                    aria-invalid={invalid}
                    value={value === null ? '' : value}
                    onChange={(e) => set(k, e.target.value === '' ? null : Number(e.target.value))}
                  />
                  <span aria-hidden="true">%</span>
                </span>
                <button type="button" className="weight__step" disabled={value === 100} aria-label={`${METRIC_LABEL[k]} 비중 1 늘리기`} onClick={() => step(k, 1)}>+</button>
              </div>
              <input
                className="weight__range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={value === null ? 0 : clamp(value)}
                aria-label={`${METRIC_LABEL[k]} 비중 슬라이더`}
                onChange={(e) => set(k, Number(e.target.value))}
              />
              <span className="weight__hint">{METRIC_HINT[k]}</span>
            </div>
          );
        })}
      </div>

      <div className="weights__savebar">
        <div className={`weights__total${ok ? ' is-ok' : ' is-bad'}`} role="status" aria-live="polite">
          합계 {sum}% / 100%
          <small>{help}</small>
        </div>
        <div className="weights__actions">
          <button type="button" className="btn btn--quiet" onClick={onDefault}>기본값</button>
          <button type="button" className="btn" disabled={same} onClick={onCancel}>변경 취소</button>
          <button type="button" className="btn btn--primary" disabled={!ok || same} onClick={onSave}>비중 저장</button>
        </div>
      </div>

      {message && (
        <p className={`weights__message weights__message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
