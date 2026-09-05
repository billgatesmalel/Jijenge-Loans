import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageCircle,
  ClipboardList,
  LogIn,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  onOpenSupport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onOpenSupport }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer when active tab changes (user navigated)
  useEffect(() => {
    setMobileOpen(false);
  }, [currentTab]);

  // Control body scroll lock — prevent page scrolling when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'faqs', label: 'FAQs' },
  ];

  const closeMenu = () => setMobileOpen(false);
  const handleNavClick = (id: string) => { onTabChange(id); closeMenu(); };
  const handleSupportClick = () => { onOpenSupport(); closeMenu(); };

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} role="banner">
      <div className="nav-container">

        {/* ── Brand ── */}
        <a
          href="#home"
          className="nav-brand"
          onClick={() => onTabChange('home')}
          aria-label="Jijenge Loans — Home"
        >
          <img
            src="/logo.png"
            alt="Jijenge Loans"
            className="nav-logo-img"
            width="36"
            height="36"
          />
          <div className="brand-text-wrapper">
            <span className="brand-title">Jijenge Loans</span>
          </div>
        </a>

        {/* ── Desktop nav links ── */}
        <nav className="nav-links" aria-label="Main navigation">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`nav-link${currentTab === id ? ' nav-link--active' : ''}`}
              onClick={() => onTabChange(id)}
              aria-current={currentTab === id ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="nav-link"
            onClick={onOpenSupport}
            aria-label="Open live support chat"
          >
            Support
          </button>
          <a
            href="#track"
            className={`nav-link${currentTab === 'track' ? ' nav-link--active' : ''}`}
            onClick={() => onTabChange('track')}
            aria-label="Track Loan"
          >
            <ClipboardList size={14} strokeWidth={1.8} aria-hidden="true" />
            Track Loan
          </a>
        </nav>

        {/* ── Desktop right actions ── */}
        <div className="nav-actions" role="group" aria-label="Account actions">
          <a href="#customer" className="btn-nav-outline">
            <LogIn size={14} strokeWidth={1.8} aria-hidden="true" />
            Customer Login
          </a>
          <button
            type="button"
            className="btn-apply-cta"
            onClick={() => onTabChange('apply')}
            aria-label="Start loan application"
          >
            Apply Now
            <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          className={`nav-hamburger${mobileOpen ? ' nav-hamburger--open' : ''}`}
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
        >
          {mobileOpen ? (
            <X size={24} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Menu size={24} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── Backdrop overlay — tap to close ── */}
      {mobileOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        id="mobile-nav-drawer"
        className={`mobile-drawer${mobileOpen ? ' mobile-drawer--open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-drawer-inner">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`mobile-nav-link${currentTab === id ? ' mobile-nav-link--active' : ''}`}
              onClick={() => handleNavClick(id)}
              tabIndex={mobileOpen ? 0 : -1}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="mobile-nav-link"
            onClick={handleSupportClick}
            tabIndex={mobileOpen ? 0 : -1}
          >
            <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
            Support Chat
          </button>

          <hr className="mobile-nav-divider" />

          <a
            href="#track"
            className="mobile-nav-link"
            onClick={() => handleNavClick('track')}
            tabIndex={mobileOpen ? 0 : -1}
          >
            <ClipboardList size={15} strokeWidth={1.8} aria-hidden="true" />
            Track Loan
          </a>
          <a
            href="#customer"
            className="mobile-nav-link"
            onClick={closeMenu}
            tabIndex={mobileOpen ? 0 : -1}
          >
            <LogIn size={15} strokeWidth={1.8} aria-hidden="true" />
            Customer Login
          </a>
          <button
            type="button"
            className="btn-apply-cta mobile-apply-btn"
            onClick={() => handleNavClick('apply')}
            tabIndex={mobileOpen ? 0 : -1}
          >
            Apply Now
            <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
