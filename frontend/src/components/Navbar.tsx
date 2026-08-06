import React from 'react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  onOpenSupport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenSupport
}) => {
  return (
    <header className="navbar">
      <div className="nav-container">
        <a href="#home" className="nav-brand" onClick={() => onTabChange('home')}>
          <div className="brand-logo-pill">BL</div>
          <span className="brand-title">Jijenge Loans</span>
        </a>

        {/* Center Tabs */}
        <div className="nav-tabs hidden md:flex">
          <button
            type="button"
            className={`tab-link ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => onTabChange('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`tab-link ${currentTab === 'how-it-works' ? 'active' : ''}`}
            onClick={() => onTabChange('how-it-works')}
          >
            How It Works
          </button>
          <button
            type="button"
            className={`tab-link ${currentTab === 'faqs' ? 'active' : ''}`}
            onClick={() => onTabChange('faqs')}
          >
            FAQs
          </button>
          <button
            type="button"
            className="tab-link"
            onClick={onOpenSupport}
          >
            Support Chat
          </button>
        </div>

        {/* Right buttons */}
        <div className="nav-right" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
          <a
            href="#track"
            className="btn-nav-apply"
            style={{ background: '#f0f9ff', color: '#0284c7', border: '1.5px solid #38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            📋 Track Loan
          </a>
          <a
            href="#customer"
            className="btn-nav-apply"
            style={{ background: '#f0f9ff', color: '#0f172a', border: '1.5px solid #cbd5e1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            🔐 Customer Login
          </a>
          <a
            href="#admin"
            className="btn-nav-apply"
            style={{ background: '#f8f5ff', color: '#6b21a8', border: '1.5px solid #d8b4fe', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            🛡️ Admin
          </a>
          <button
            type="button"
            className="btn-nav-apply"
            onClick={() => onTabChange('apply')}
          >
            Apply Now
          </button>
        </div>
      </div>
    </header>
  );
};
