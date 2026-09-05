import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { FaqsPage } from './pages/FaqsPage';
import { SupportPage } from './pages/SupportPage';
import { TrackLoanPage } from './pages/TrackLoanPage';
import { ApplicationFormModal } from './components/ApplicationFormModal';
import { CustomerDashboardModal } from './components/CustomerDashboardModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { SupportChatModal } from './components/SupportChatModal';

export const AppContent: React.FC = () => {
  const [supportOpen, setSupportOpen] = useState(false);
  const navigate = useNavigate();

  const handleTabChange = (tabId: string) => {
    const clean = tabId.replace('#', '');
    if (!clean || clean === 'home') {
      navigate('/');
    } else {
      navigate(`/${clean}`);
    }
  };

  return (
    <Routes>
      {/* Public Pages wrapped in PublicLayout */}
      <Route
        element={
          <PublicLayout
            supportOpen={supportOpen}
            onOpenSupport={() => setSupportOpen(true)}
            onCloseSupport={() => setSupportOpen(false)}
          />
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/faqs" element={<FaqsPage />} />
        <Route path="/support" element={<SupportPage onOpenSupport={() => setSupportOpen(true)} />} />
        <Route path="/track-loan" element={<TrackLoanPage onOpenSupport={() => setSupportOpen(true)} />} />
      </Route>

      {/* Standalone Application & Portal Routes */}
      <Route
        path="/apply"
        element={
          <div className="tab-pane active" style={{ display: 'block', minHeight: '100vh', background: 'var(--bg-page)' }}>
            <ApplicationFormModal onTabChange={handleTabChange} />
          </div>
        }
      />

      <Route
        path="/customer"
        element={
          <div className="portal-container login-active">
            <CustomerDashboardModal
              onClose={() => navigate('/')}
              onOpenSupport={() => setSupportOpen(true)}
            />
            <SupportChatModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
          </div>
        }
      />

      <Route
        path="/super-admin"
        element={<AdminDashboardModal onClose={() => navigate('/')} />}
      />

      {/* Legacy admin fallback route */}
      <Route path="/admin" element={<Navigate to="/super-admin" replace />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
