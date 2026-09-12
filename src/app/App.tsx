import { useEffect, useState } from 'react';
import { useHashRoute } from './router';
import { loadDataset, type LoadedData } from './dataset';
import { Header } from '../components/Header';
import { AdvertiserPage } from './AdvertiserPage';
import { LoginPage } from './LoginPage';
import { AdminPage } from './AdminPage';

export default function App() {
  const route = useHashRoute();
  const [data, setData] = useState<LoadedData | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadDataset().then((result) => {
      if (active) setData(result);
    });
    return () => { active = false; };
  }, [attempt]);
  if (route === 'login') return <LoginPage />;
  if (!data || !data.ok) return (
    <div className="page">
      <Header variant="advertiser" />
      <main className="main">
        {data === null ? (
          <section className="card" role="status">크리에이터 데이터를 불러오는 중입니다.</section>
        ) : (
          <section className="card error" role="alert">
            <p>{data.message}</p>
            <button type="button" onClick={() => { setData(null); setAttempt((value) => value + 1); }}>다시 시도</button>
          </section>
        )}
      </main>
    </div>
  );
  if (route === 'admin') return <AdminPage data={data} />;
  return <AdvertiserPage data={data} />;
}
