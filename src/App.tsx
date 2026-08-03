import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { DataProvider, useData } from './lib/data-context';
import { AuthScreen } from './components/AuthScreen';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { Layout } from './components/Layout';
import { PrivacyPage, TermsPage, DisclaimerPage, NotFoundPage } from './components/LegalPages';
import {
  DashboardView, BudgetView, TransactionsView, InvestmentsView, GoalsView,
  ReportsView, NetWorthView, ScannerView, CopilotView, AllocatorView, SettingsView,
} from './components/Views';

function AppRoutes() {
  const { ready, userId } = useAuth();
  const { isGuest, guestMode } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 35));
      const y = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
      document.documentElement.style.setProperty('--tilt-x', `${x * 4}px`);
      document.documentElement.style.setProperty('--tilt-y', `${y * 3}px`);
    };
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  if (!ready) {
    return <div className="app-shell" style={{ placeItems: 'center' }}><p style={{ color: '#8d9cb0' }}>Loading…</p></div>;
  }

  const navigateToView = (v: string) => {
    navigate(`/${v}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isExploring = isGuest && guestMode !== null;

  const renderView = (view: React.ReactNode) => {
    if (userId || isExploring) {
      return <Layout navigateToView={navigateToView}>{view}</Layout>;
    }
    return <Navigate to="/" replace />;
  };

  return (
    <>
      <AuthModal />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={userId ? <Navigate to="/dashboard" replace /> : <AuthScreen />} />
        <Route path="/signup" element={userId ? <Navigate to="/dashboard" replace /> : <AuthScreen />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />

        {/* App routes — accessible to both guests (exploring) and authenticated users */}
        <Route path="/dashboard" element={renderView(<DashboardView navigateToView={navigateToView} />)} />
        <Route path="/allocator" element={renderView(<AllocatorView />)} />
        <Route path="/scanner" element={renderView(<ScannerView navigateToView={navigateToView} />)} />
        <Route path="/copilot" element={renderView(<CopilotView />)} />
        <Route path="/transactions" element={renderView(<TransactionsView />)} />
        <Route path="/budget" element={renderView(<BudgetView />)} />
        <Route path="/investments" element={renderView(<InvestmentsView />)} />
        <Route path="/goals" element={renderView(<GoalsView />)} />
        <Route path="/reports" element={renderView(<ReportsView />)} />
        <Route path="/networth" element={renderView(<NetWorthView />)} />
        <Route path="/settings" element={renderView(<SettingsView />)} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </BrowserRouter>
  );
}
