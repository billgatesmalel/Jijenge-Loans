import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SupportChatModal } from './SupportChatModal';
import { Headphones } from 'lucide-react';

interface PublicLayoutProps {
  supportOpen: boolean;
  onOpenSupport: () => void;
  onCloseSupport: () => void;
  directToken?: string | null;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  supportOpen,
  onOpenSupport,
  onCloseSupport,
  directToken,
}) => {
  const navigate = useNavigate();

  return (
    <div className="site-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenSupport={onOpenSupport} />
      
      <main className="tab-content-wrapper" style={{ flex: 1 }}>
        <Outlet context={{ onOpenSupport }} />
      </main>

      <Footer onOpenSupport={onOpenSupport} />

      {/* Floating Website Support Centre Action Button */}
      <button
        type="button"
        onClick={() => navigate('/support')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50px',
          padding: '0.75rem 1.25rem',
          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.875rem',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label="Open Jijenge Support Centre"
      >
        <div style={{ position: 'relative', display: 'flex' }}>
          <Headphones size={20} />
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '8px',
            height: '8px',
            background: '#22c55e',
            borderRadius: '50%',
            border: '1.5px solid #ea580c'
          }} />
        </div>
        <span>Support Centre</span>
      </button>

      <SupportChatModal isOpen={supportOpen} onClose={onCloseSupport} directToken={directToken} />
    </div>
  );
};

export default PublicLayout;
