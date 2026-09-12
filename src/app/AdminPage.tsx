import { useEffect, useState } from 'react';
import type { LoadedData } from './dataset';
import { isAdminLoggedIn, logout, ADMIN_ACCOUNT } from './session';
import { navigate } from './router';
import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import { WeightsCard } from '../components/WeightsCard';
import { MatchingWorkspace } from '../components/MatchingWorkspace';
import { DEFAULT_WEIGHTS, draftToWeights, loadWeights, saveWeights, toDraft } from '../domain/weights';
import type { WeightsDraft } from '../domain/weights';
import type { Weights } from '../domain/types';

export function AdminPage({ data }: { data: LoadedData }) {
  const loggedIn = isAdminLoggedIn();
  const [saved, setSaved] = useState<Weights>(loadWeights);
  const [draft, setDraft] = useState<WeightsDraft>(() => toDraft(saved));
  // 합계가 정확히 100일 때만 미리보기를 갱신한다. 그 전까지는 마지막으로 유효했던 비중 유지 (L23)
  const [preview, setPreview] = useState<Weights>(saved);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loggedIn) navigate('/login');
  }, [loggedIn]);
  if (!loggedIn) return null;

  const handleChange = (next: WeightsDraft) => {
    setDraft(next);
    setMessage(null);
    const w = draftToWeights(next);
    if (w) setPreview(w);
  };
  const handleSave = () => {
    const w = draftToWeights(draft);
    if (!w) return;
    if (saveWeights(w)) {
      setSaved(w);
      setPreview(w);
      setMessage({ kind: 'success', text: '저장했습니다. 광고주 화면에 적용됩니다.' });
    } else {
      setMessage({ kind: 'error', text: '저장에 실패했습니다. 브라우저 저장소를 사용할 수 없습니다.' });
    }
  };
  const handleCancel = () => {
    setDraft(toDraft(saved));
    setPreview(saved);
    setMessage(null);
  };
  const handleDefault = () => handleChange(toDraft(DEFAULT_WEIGHTS));
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page">
      <Header variant="admin" accountName={ADMIN_ACCOUNT.id} onLogout={handleLogout} />
      <main className="main">
        {data.ok ? (
          <MatchingWorkspace
            variant="admin"
            creators={data.creators}
            stats={data.stats}
            weights={preview}
            savedWeights={saved}
            afterSearchPanel={(
              <WeightsCard
                draft={draft}
                saved={saved}
                onChange={handleChange}
                onSave={handleSave}
                onCancel={handleCancel}
                onDefault={handleDefault}
                message={message}
              />
            )}
          />
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
