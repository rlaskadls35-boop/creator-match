import type { DatasetStats } from '../domain/types';

/** 설계 §4 "데이터 상태 줄" */
export function DataStatusFooter({ stats }: { stats: DatasetStats }) {
  const parts = [`크리에이터 ${stats.total}명 로드`, `캠페인 이력 없음 ${stats.noHistoryCount}명`, '데이터: dummy_creators.csv'];
  if (stats.skippedRows > 0) parts.push(`제외된 행 ${stats.skippedRows}개`);
  return <footer className="footer">{parts.join(' · ')}</footer>;
}
