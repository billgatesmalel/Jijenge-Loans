import React, { useState, useEffect } from 'react';
import {
  Home,
  Info,
  HelpCircle,
  MessageCircle,
  ClipboardList,
  LogIn,
  ShieldCheck,
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

  // Close drawer on hash navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [currentTab]);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'faqs', label: 'FAQs' },
  ];

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
            src="/favicon.svg"
            alt=""
            className="nav-logo-img"
            width="28"
            height="28"
          />
          <div className="brand-text-wrapper">
            <span className="brand-title">Jijenge Loans</span>
            <span className="brand-tagline">Fast Business Funding</span>
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
          <a href="#admin" className="btn-admin-link" aria-label="Admin portal">
            <ShieldCheck size={12} strokeWidth={1.8} aria-hidden="true" />
            Admin
          </a>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          className="nav-hamburger"
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
        >
          {mobileOpen
            ? <X size={22} strokeWidth={2} aria-hidden="true" />
            : <Menu size={22} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        id="mobile-nav-drawer"
        className={`mobile-drawer${mobileOpen ? ' mobile-drawer--open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="mobile-drawer-inner">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`mobile-nav-link${currentTab === id ? ' mobile-nav-link--active' : ''}`}
              onClick={() => { onTabChange(id); setMobileOpen(false); }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => { onOpenSupport(); setMobileOpen(false); }}
          >
            <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
            Support Chat
          </button>

          <hr className="mobile-nav-divider" />

          <a href="#track" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            <ClipboardList size={15} strokeWidth={1.8} aria-hidden="true" />
            Track Loan
          </a>
          <a href="#customer" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            <LogIn size={15} strokeWidth={1.8} aria-hidden="true" />
            Customer Login
          </a>
          <button
            type="button"
            className="btn-apply-cta mobile-apply-btn"
            onClick={() => { onTabChange('apply'); setMobileOpen(false); }}
          >
            Apply Now
            <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
