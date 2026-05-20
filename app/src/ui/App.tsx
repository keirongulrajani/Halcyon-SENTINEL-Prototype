import { Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/header';
import { DashboardPage } from './pages/dashboard-page';
import { RecordsPage } from './pages/records-page';
import { RecordDetailPage } from './pages/record-detail-page';
import { FindingsPage } from './pages/findings-page';
import { IntakePage } from './pages/intake-page';

export function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-page py-page">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:clientId" element={<RecordDetailPage />} />
          <Route path="/findings" element={<FindingsPage />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
