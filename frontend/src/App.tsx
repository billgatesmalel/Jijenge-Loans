import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { FaqsPage } from './pages/FaqsPage';
import { SupportPage } from './pages/SupportPage';
import { TrackLoanPage } from './pages/TrackLoanPage';
import { ApplyPage } from './pages/ApplyPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { CustomerPage } from './pages/CustomerPage';
import { AdminDashboardModal } from './components/AdminDashboardModal';

export const AppContent: React.FC = () => {
  const [supportOpen, setSupportOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'customer') {
      navigate('/customer', { replace: true });
    } else if (hash === 'admin' || hash === 'super-admin') {
      navigate('/super-admin', { replace: true });
    } else if (hash === 'apply') {
      navigate('/apply', { replace: true });
    } else if (hash === 'support') {
      navigate('/support', { replace: true });
    } else if (hash === 'track-loan' || hash === 'track') {
      navigate('/track-loan', { replace: true });
    }
  }, [navigate]);

  return (
    <Routes>
      {/* All public pages share the same Navbar + Footer + SupportChat layout */}
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
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms-and-conditions" element={<TermsPage />} />
        <Route path="/customer" element={<CustomerPage />} />
      </Route>

      {/* Standalone admin portal route */}
      <Route
        path="/super-admin"
        element={<AdminDashboardModal onClose={() => navigate('/')} />}
      />

      {/* Legacy admin fallback */}
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
