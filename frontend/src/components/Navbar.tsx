import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LogIn,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  onOpenSupport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSupport }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer and scroll to top when path changes
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

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
    { path: '/', label: 'Home' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/faqs', label: 'FAQs' },
    { path: '/support', label: 'Support' },
    { path: '/track-loan', label: 'Track Loan' },
  ];

  const closeMenu = () => setMobileOpen(false);

  const handleNavClick = (path: string) => {
    closeMenu();
    navigate(path);
  };

  return (
    <>
      <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} role="banner">
        <div className="nav-container">

          {/* ── Brand ── */}
          <Link
            to="/"
            className="nav-brand"
            onClick={closeMenu}
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
          </Link>

          {/* ── Desktop nav links ── */}
          <nav className="nav-links" aria-label="Main navigation">
            {navLinks.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* ── Desktop right actions ── */}
          <div className="nav-actions" role="group" aria-label="Account actions">
            <Link
              to="/customer"
              className={`btn-nav-outline${location.pathname === '/customer' ? ' btn-nav-outline--active' : ''}`}
            >
              <LogIn size={14} strokeWidth={1.8} aria-hidden="true" />
              Customer Login
            </Link>
            <Link
              to="/apply"
              className={`btn-apply-cta${location.pathname === '/apply' ? ' btn-apply-cta--active' : ''}`}
              aria-label="Start loan application"
            >
              Apply Now
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </Link>
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
      </header>

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
        <div className="mobile-drawer-header">
          <span className="mobile-drawer-title">Navigation</span>
          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        <div className="mobile-drawer-inner">
          {navLinks.map(({ path, label }) => (
            <button
              key={path}
              type="button"
              className={`mobile-nav-link${(path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)) ? ' mobile-nav-link--active' : ''}`}
              onClick={() => handleNavClick(path)}
              tabIndex={mobileOpen ? 0 : -1}
            >
              {label}
            </button>
          ))}

          <hr className="mobile-nav-divider" />

          <button
            type="button"
            className={`mobile-nav-link${location.pathname === '/customer' ? ' mobile-nav-link--active' : ''}`}
            onClick={() => handleNavClick('/customer')}
            tabIndex={mobileOpen ? 0 : -1}
          >
            <LogIn size={16} strokeWidth={1.8} aria-hidden="true" />
            Customer Login
          </button>

          <button
            type="button"
            className="btn-apply-cta mobile-apply-btn"
            onClick={() => handleNavClick('/apply')}
            tabIndex={mobileOpen ? 0 : -1}
          >
            Apply Now
            <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
