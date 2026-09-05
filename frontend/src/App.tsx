import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
