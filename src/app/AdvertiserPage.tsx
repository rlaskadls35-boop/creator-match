import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import type { LoadedData } from './dataset';

export function AdvertiserPage({ data }: { data: LoadedData }) {
  return (
    <div className="page">
      <Header variant="advertiser" />
      <main className="main">
        <p className="intro">우리 브랜드에 맞는 크리에이터, 예산 안에서 찾아드립니다.</p>
        {data.ok ? (
          <section className="card card--placeholder">입력 패널은 다음 단계에서 추가됩니다.</section>
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
