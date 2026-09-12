import { useState } from 'react';
import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import { MatchingWorkspace } from '../components/MatchingWorkspace';
import { loadWeights } from '../domain/weights';
import type { LoadedData } from './dataset';

export function AdvertiserPage({ data }: { data: LoadedData }) {
  // 광고주 화면은 저장된 비중만 쓴다 (설계 §6.4). 페이지 진입 시 한 번 읽는다
  const [weights] = useState(() => loadWeights());
  return (
    <div className="page">
      <Header variant="advertiser" />
      <main className="main">
        {data.ok ? (
          <MatchingWorkspace creators={data.creators} stats={data.stats} weights={weights} />
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
