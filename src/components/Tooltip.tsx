import { useId } from 'react';

/** ⓘ 버튼에 마우스를 올리거나 포커스하면 설명이 뜬다 */
export function Tooltip({ text, label = '설명 보기' }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="tip">
      <button type="button" className="tip__trigger" aria-label={label} aria-describedby={id}>ⓘ</button>
      <span role="tooltip" id={id} className="tip__bubble">{text}</span>
    </span>
  );
}
