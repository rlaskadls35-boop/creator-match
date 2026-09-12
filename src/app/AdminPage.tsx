import { useEffect, useMemo, useState } from 'react';
import type { LoadedData } from './dataset';
import { isAdminLoggedIn, logout, ADMIN_ACCOUNT } from './session';
import { navigate } from './router';
import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import { WeightsCard } from '../components/WeightsCard';
import { MatchingWorkspace } from '../components/MatchingWorkspace';
import { DEFAULT_WEIGHTS, loadWeights, normalizeWeights, saveWeights } from '../domain/weights';
import type { Weights } from '../domain/types';

export function AdminPage({ data }: { data: LoadedData }) {
  const loggedIn = isAdminLoggedIn();
  const [draft, setDraft] = useState<Weights>(() => loadWeights());
  const [message, setMessage] = useState<string | null>(null);
  // 저장 전이라도 이 화면의 결과에는 실시간 반영. 합이 100이 아니면 비율로 환산 (L21)
  const previewWeights = useMemo(() => normalizeWeights(draft), [draft]);

  useEffect(() => {
    if (!loggedIn) navigate('/login');
  }, [loggedIn]);
  if (!loggedIn) return null;

  const handleSave = () =>
    setMessage(saveWeights(draft) ? '저장했습니다. 광고주 화면에 적용됩니다.' : '저장에 실패했습니다. 브라우저 저장소를 사용할 수 없습니다.');
  const handleReset = () => {
    setDraft({ ...DEFAULT_WEIGHTS });
    setMessage(null);
  };
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page">
      <Header variant="admin" accountName={ADMIN_ACCOUNT.id} onLogout={handleLogout} />
      <main className="main">
        {data.ok ? (
          <>
            <WeightsCard
              draft={draft}
              onChange={(w) => {
                setDraft(w);
                setMessage(null);
              }}
              onSave={handleSave}
              onReset={handleReset}
              message={message}
            />
            <MatchingWorkspace creators={data.creators} stats={data.stats} weights={previewWeights} />
          </>
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
