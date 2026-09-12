import { Header } from '../components/Header';
import type { LoadedData } from './dataset';

export function AdminPage({ data }: { data: LoadedData }) {
  return (
    <div className="page">
      <Header variant="admin" accountName="admin" />
      <main className="main"><section className="card card--placeholder">{data.ok ? '운영자 화면은 다음 단계에서 추가됩니다.' : data.message}</section></main>
    </div>
  );
}
