import { useMemo } from 'react';
import { useHashRoute } from './router';
import { loadDataset } from './dataset';
import { AdvertiserPage } from './AdvertiserPage';
import { LoginPage } from './LoginPage';
import { AdminPage } from './AdminPage';

export default function App() {
  const route = useHashRoute();
  const data = useMemo(() => loadDataset(), []);
  if (route === 'login') return <LoginPage />;
  if (route === 'admin') return <AdminPage data={data} />;
  return <AdvertiserPage data={data} />;
}
