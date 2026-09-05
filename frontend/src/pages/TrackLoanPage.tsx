import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { TrackLoanView } from '../components/TrackLoanView';

interface PublicLayoutContext {
  onOpenSupport?: () => void;
}

class TrackErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Track loan error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-16 px-6 max-w-lg mx-auto">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-extrabold text-brand-navy mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-brand-muted mb-6 leading-relaxed">
            We couldn't load the loan tracking page. Please refresh the page and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ borderRadius: '12px' }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const TrackLoanPage: React.FC<{ onOpenSupport?: () => void }> = ({ onOpenSupport: propOpenSupport }) => {
  const navigate = useNavigate();
  const context = useOutletContext<PublicLayoutContext>();
  const handleOpenSupport = propOpenSupport || context?.onOpenSupport || (() => navigate('/support'));

  const handleTabChange = (tabId: string) => {
    if (tabId === 'apply') {
      navigate('/apply');
    } else if (tabId === 'home') {
      navigate('/');
    } else {
      navigate(`/${tabId}`);
    }
  };

  return (
    <div className="track-loan-page py-8">
      <TrackErrorBoundary>
        <TrackLoanView
          onTabChange={handleTabChange}
          onOpenSupport={handleOpenSupport}
        />
      </TrackErrorBoundary>
    </div>
  );
};

export default TrackLoanPage;
