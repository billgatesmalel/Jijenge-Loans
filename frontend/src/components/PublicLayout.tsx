import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SupportChatModal } from './SupportChatModal';

interface PublicLayoutProps {
  supportOpen: boolean;
  onOpenSupport: () => void;
  onCloseSupport: () => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  supportOpen,
  onOpenSupport,
  onCloseSupport,
}) => {
  return (
    <div className="site-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenSupport={onOpenSupport} />
      
      <main className="tab-content-wrapper" style={{ flex: 1 }}>
        <Outlet context={{ onOpenSupport }} />
      </main>

      <Footer onOpenSupport={onOpenSupport} />
      <SupportChatModal isOpen={supportOpen} onClose={onCloseSupport} />
    </div>
  );
};

export default PublicLayout;
