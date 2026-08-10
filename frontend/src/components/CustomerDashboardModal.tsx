import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Home, Info, HelpCircle, MessageCircle,
  ClipboardList, ArrowRight, Menu, X, Lock,
} from 'lucide-react';

interface CustomerDashboardProps {
  onClose: () => void;
}

export const CustomerDashboardModal: React.FC<CustomerDashboardProps> = ({ onClose }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [error, setError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [userRole, setUserRole] = useState<string>('CUSTOMER');
  const [userData, setUserData] = useState<any>(null);
  const [latestLoan, setLatestLoan] = useState<any>(null);
  const [allocatedBalance, setAllocatedBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('bl_customer_token');
    const storedRole = sessionStorage.getItem('bl_customer_role') || 'CUSTOMER';
    if (token) {
      setIsLoggedIn(true);
      setUserRole(storedRole);
      loadDashboardData(token);
    }
  }, []);

  const loadDashboardData = async (token: string) => {
    try {
      const res = await fetch('/api/customer/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserData(data.user);
        setLatestLoan(data.latestLoan);
        setAllocatedBalance(data.totalAllocatedBalance);
        if (data.latestLoan?.withdrawals) setWithdrawals(data.latestLoan.withdrawals);
      } else {
        sessionStorage.removeItem('bl_customer_token');
        sessionStorage.removeItem('bl_customer_role');
        setIsLoggedIn(false);
      }
    } catch {
      setError('Connection error. Failed to load dashboard.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) return;
    setLoginLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        const role = data.role || 'CUSTOMER';
        sessionStorage.setItem('bl_customer_token', data.accessToken);
        sessionStorage.setItem('bl_customer_role', role);
        setUserRole(role);
        setIsLoggedIn(true);
        loadDashboardData(data.accessToken);
      } else {
        setError(data.message || 'Authentication failed. Please verify your phone and PIN.');
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResendPin = async () => {
    if (!phone.trim()) {
      setError('Please enter your M-Pesa phone number first.');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/customer/resend-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendSent(true);
        setTimeout(() => setResendSent(false), 6000);
      } else {
        setError(data.message || 'Could not resend PIN. Please contact support.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bl_customer_token');
    sessionStorage.removeItem('bl_customer_role');
    setIsLoggedIn(false);
    setUserData(null);
    setLatestLoan(null);
    setAllocatedBalance(0);
    setWithdrawals([]);
    onClose();
  };

  const handleSwitchToAdmin = () => { window.location.hash = 'admin'; };

  const handleWithdrawFunds = async () => {
    if (!latestLoan || allocatedBalance <= 0) return;
    const token = sessionStorage.getItem('bl_customer_token');
    if (!token) return;
    setWithdrawLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customer/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ loanId: latestLoan.id, amount: allocatedBalance }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawSuccess(true);
        setTimeout(() => { loadDashboardData(token); }, 1500);
      } else {
        setError(data.message || 'Failed to submit withdrawal request.');
        setWithdrawLoading(false);
      }
    } catch {
      setError('Connection error. Failed to initiate withdrawal.');
      setWithdrawLoading(false);
    }
  };

  const closeSuccessOverlay = () => {
    setWithdrawSuccess(false);
    setWithdrawLoading(false);
    const token = sessionStorage.getItem('bl_customer_token');
    if (token) loadDashboardData(token);
  };

  const getStatusBadgeClass = (status: string) => {
    if (!status) return 'badge-review';
    const s = status.toLowerCase();
    if (s.includes('review') || s.includes('process') || s.includes('pending')) return 'badge-review';
    if (s.includes('approved') || s.includes('active') || s.includes('paid')) return 'badge-approved';
    if (s.includes('disbursed')) return 'badge-disbursed';
    return 'badge-failed';
  };

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const formattedFee = Math.round(allocatedBalance * 0.02) || 50;

  /* ─── Shared focus handlers ─── */
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#FF6600';
    e.target.style.boxShadow = '0 0 0 3px rgba(255,102,0,0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#cbd5e1';
    e.target.style.boxShadow = 'none';
  };

  /* ─── Nav links config ─── */
  const navLinks = [
    { label: 'Home', hash: 'home', icon: <Home size={14} /> },
    { label: 'How It Works', hash: 'how-it-works', icon: <Info size={14} /> },
    { label: 'FAQs', hash: 'faqs', icon: <HelpCircle size={14} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f8fafc', boxSizing: 'border-box' }}>

      {/* ══════════════════════════════════════════════
          HEADER — full nav on desktop, hamburger on mobile
      ══════════════════════════════════════════════ */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 1.25rem',
          height: '64px',
          boxSizing: 'border-box',
        }}>
          {/* Brand */}
          <a
            href="#home"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', flexShrink: 0 }}
          >
            <img src="/logo.png" alt="Jijenge Loans" style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 8 }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontFamily: 'inherit' }}>
              Jijenge Loans
            </span>
          </a>

          {/* ── Desktop centre nav ── */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="cust-desktop-nav" aria-label="Main navigation">
            {navLinks.map(({ label, hash }) => (
              <a
                key={hash}
                href={`#${hash}`}
                onClick={onClose}
                style={{
                  color: '#64748b',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  transition: 'color 0.15s ease, background 0.15s ease',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#FF6600'; (e.currentTarget as HTMLAnchorElement).style.background = '#FFF5ED'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#64748b'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
              >
                {label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => { onClose(); /* support is handled by App */ }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontWeight: 600, fontSize: '0.9rem',
                padding: '0.5rem 0.75rem', borderRadius: 8,
                transition: 'color 0.15s ease, background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#FF6600'; (e.currentTarget as HTMLButtonElement).style.background = '#FFF5ED'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <MessageCircle size={14} aria-hidden />
              Support
            </button>
            <a
              href="#track"
              style={{
                color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
                padding: '0.5rem 0.75rem', borderRadius: 8,
                transition: 'color 0.15s ease, background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#FF6600'; (e.currentTarget as HTMLAnchorElement).style.background = '#FFF5ED'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#64748b'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <ClipboardList size={14} aria-hidden />
              Track Loan
            </a>
          </nav>

          {/* ── Desktop right actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }} className="cust-desktop-actions">
            {isLoggedIn && isAdmin && (
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: '#fff', border: 'none',
                  padding: '0.45rem 1rem', borderRadius: 8,
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                  fontFamily: 'inherit',
                }}
              >
                ⚡ Admin Panel
              </button>
            )}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: '#f1f5f9', color: '#0f172a',
                  border: '1px solid #cbd5e1', padding: '0.5rem 1rem',
                  borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Sign Out
              </button>
            ) : (
              <a
                href="#apply"
                onClick={onClose}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: '#FF6600', color: '#fff',
                  padding: '0.55rem 1.15rem', borderRadius: 12,
                  fontSize: '0.875rem', fontWeight: 700,
                  textDecoration: 'none', boxShadow: '0 4px 14px rgba(255,102,0,0.28)',
                  transition: 'background 0.2s ease, transform 0.15s ease',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#E55C00'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#FF6600'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; }}
              >
                Apply Now <ArrowRight size={14} aria-hidden />
              </a>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            type="button"
            className="cust-hamburger"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#0f172a', padding: '0.4rem',
              minWidth: 44, minHeight: 44,
              borderRadius: 8, display: 'none',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileNavOpen && (
          <div style={{
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            padding: '1rem 1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}>
            {navLinks.map(({ label, hash, icon }) => (
              <a
                key={hash}
                href={`#${hash}`}
                onClick={() => { onClose(); setMobileNavOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  color: '#475569', textDecoration: 'none', fontWeight: 600,
                  fontSize: '0.95rem', padding: '0.75rem 0.85rem',
                  borderRadius: 8, minHeight: 48,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                {icon} {label}
              </a>
            ))}
            <a
              href="#track"
              onClick={() => setMobileNavOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                color: '#475569', textDecoration: 'none', fontWeight: 600,
                fontSize: '0.95rem', padding: '0.75rem 0.85rem',
                borderRadius: 8, minHeight: 48, fontFamily: 'inherit',
              }}
            >
              <ClipboardList size={15} /> Track Loan
            </a>
            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0.4rem 0' }} />
            <a
              href="#apply"
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                background: '#FF6600', color: '#fff',
                padding: '0.8rem 1rem', borderRadius: 12,
                fontSize: '0.95rem', fontWeight: 700,
                textDecoration: 'none', marginTop: '0.25rem', fontFamily: 'inherit',
              }}
            >
              Apply Now <ArrowRight size={16} />
            </a>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          INLINE CSS for responsive nav visibility
      ══════════════════════════════════════════════ */}
      <style>{`
        @media (max-width: 900px) {
          .cust-desktop-nav { display: none !important; }
          .cust-desktop-actions { display: none !important; }
          .cust-hamburger { display: flex !important; }
        }
        @media (min-width: 901px) {
          .cust-hamburger { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div style={{ maxWidth: 900, margin: '2.5rem auto', padding: '0 1.25rem' }}>

        {/* ── LOGIN FORM ── */}
        {!isLoggedIn ? (
          <div style={{
            maxWidth: 440, margin: '0 auto',
            background: '#ffffff', border: '1.5px solid #e2e8f0',
            padding: '2.5rem 2rem', borderRadius: 24,
            boxShadow: '0 12px 40px rgba(0,0,0,0.05)',
          }}>
            {/* Icon + heading */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                background: '#FFF5ED', color: '#FF6600',
                width: 52, height: 52, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', margin: '0 auto 0.85rem',
                border: '1.5px solid #FFD6B3',
              }}>
                🔐
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem', fontFamily: 'inherit' }}>
                Customer Portal Login
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Access your allocated loan balance &amp; withdraw to M-Pesa
              </p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              {/* Phone */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', fontFamily: 'inherit' }}>
                  Registered M-Pesa Phone Number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{
                    width: '100%', padding: '0.85rem 1.1rem',
                    borderRadius: 12, border: '2px solid #cbd5e1',
                    fontSize: '0.95rem', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  required
                />
              </div>

              {/* PIN with show/hide toggle */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', fontFamily: 'inherit' }}>
                    Security PIN
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="customer-pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{
                      width: '100%', padding: '0.85rem 3rem 0.85rem 1.1rem',
                      borderRadius: 12, border: '2px solid #cbd5e1',
                      fontSize: '0.95rem', outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    required
                  />
                  {/* Eye toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    style={{
                      position: 'absolute', right: '0.9rem',
                      top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: '0.2rem',
                      display: 'flex', alignItems: 'center',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Resend PIN */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                {resendSent ? (
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ PIN sent via SMS!
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendPin}
                    disabled={resendLoading}
                    style={{
                      background: 'none', border: 'none', cursor: resendLoading ? 'not-allowed' : 'pointer',
                      color: resendLoading ? '#94a3b8' : '#FF6600',
                      fontSize: '0.78rem', fontWeight: 700,
                      padding: 0, fontFamily: 'inherit',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!resendLoading) (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none'; }}
                  >
                    {resendLoading ? 'Sending...' : 'Resend PIN via SMS'}
                  </button>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="btn-customer-login"
                disabled={loginLoading}
                style={{
                  width: '100%',
                  background: loginLoading ? '#FFA366' : '#FF6600',
                  color: '#ffffff',
                  padding: '0.9rem 1.5rem',
                  borderRadius: 12,
                  fontSize: '1rem', fontWeight: 800, border: 'none',
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(255,102,0,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  minHeight: 52, fontFamily: 'inherit',
                  transition: 'background 0.2s ease, transform 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!loginLoading) { (e.currentTarget as HTMLButtonElement).style.background = '#E55C00'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = loginLoading ? '#FFA366' : '#FF6600'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
              >
                {loginLoading ? 'Verifying...' : (
                  <>
                    <span>Verify Credentials</span>
                    <ArrowRight size={16} aria-hidden />
                  </>
                )}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: '1.1rem', background: '#fef2f2',
                border: '1.5px solid #fecaca', padding: '0.85rem 1.1rem',
                borderRadius: 12, color: '#991b1b', fontSize: '0.875rem', fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            {/* ── Security footer ── */}
            <div style={{
              marginTop: '1.5rem', paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              fontSize: '0.75rem', color: '#94a3b8',
            }}>
              <Lock size={14} style={{ color: '#10b981', flexShrink: 0 }} aria-hidden />
              <span>256-Bit SSL Encrypted Connection · ODPC Data Protected</span>
            </div>
          </div>

        ) : (
          /* ── PORTAL DASHBOARD (logged in) ── */
          userData && (
            <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '2.5rem', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              {/* Welcome header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h2 id="welcome-name" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem', fontFamily: 'inherit' }}>
                    Welcome, {userData.fullName}!
                  </h2>
                  <p id="welcome-phone" style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
                    📱 {userData.phoneNumber} {latestLoan && `| Ref: ${latestLoan.transactionRef}`}
                  </p>
                </div>
                {latestLoan && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Loan Status</span>
                    <span className={`badge-status ${getStatusBadgeClass(latestLoan.status)}`} style={{ padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.825rem', fontWeight: 800 }}>
                      {latestLoan.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 16, padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Allocated Loan Balance</span>
                  <strong style={{ fontSize: '1.75rem', color: '#047857', fontWeight: 800 }}>KES {allocatedBalance.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>M-Pesa Disbursal Fee</span>
                  <strong style={{ fontSize: '1.75rem', color: '#475569', fontWeight: 800 }}>KES {formattedFee.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#f0f9ff', border: '1.5px solid #38bdf8', borderRadius: 16, padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Amount You Will Receive</span>
                  <strong style={{ fontSize: '1.75rem', color: '#0369a1', fontWeight: 800 }}>KES {allocatedBalance.toLocaleString()}</strong>
                </div>
              </div>

              {/* Withdraw panel */}
              {latestLoan && allocatedBalance > 0 && (
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 16, padding: '1.5rem', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.5rem', fontFamily: 'inherit' }}>Withdraw Funds to M-Pesa</h3>
                  <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                    Your matched loan is active and pre-approved for immediate cashout. Press the button below to initiate disbursal.
                  </p>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleWithdrawFunds}
                    disabled={withdrawLoading}
                    style={{ maxWidth: 280, margin: 0 }}
                  >
                    {withdrawLoading ? 'Initiating...' : '💸 Request Withdrawal to M-Pesa'}
                  </button>
                </div>
              )}

              {/* Withdrawal history */}
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', fontFamily: 'inherit' }}>Withdrawal Transaction History</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#edf2f5', textAlign: 'left' }}>
                        {['Date Requested', 'Disbursed Amount', 'Withdrawal Fee', 'Transaction ID', 'Disbursal Status'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, fontFamily: 'inherit' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length > 0 ? withdrawals.map((w) => (
                        <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: 500 }}>
                            {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: 800 }}>KES {w.amount.toLocaleString()}</td>
                          <td style={{ padding: '0.9rem 1rem' }}>KES {w.withdrawalFee.toLocaleString()}</td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: 4 }}>{w.checkoutRequestId}</code>
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <span className={`badge-status ${getStatusBadgeClass(w.status)}`} style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700 }}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1.5rem' }}>
                            No withdrawals recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Processing overlay ── */}
      {withdrawLoading && !withdrawSuccess && (
        <div className="modal-backdrop" style={{ display: 'flex', zIndex: 999 }}>
          <div className="modal-dialog" style={{ maxWidth: 440, textAlign: 'center', padding: '2.5rem 1.75rem', background: '#ffffff', borderRadius: 16 }}>
            <div className="processing-box">
              <div className="spinner-ring" style={{ width: 56, height: 56, borderWidth: 5, borderTopColor: '#FF6600', margin: '0 auto 1.25rem' }} />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', fontFamily: 'inherit' }}>
                Initiating M-Pesa Withdrawal...
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                Sending cashout prompt to <strong>{userData?.phoneNumber}</strong>. Enter your M-Pesa PIN to authorize withdrawal fee of <strong>KES {formattedFee.toLocaleString()}</strong>.
              </p>
              <div style={{ height: 10, borderRadius: 5, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ width: '60%', background: '#FF6600', height: '100%', borderRadius: 5 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Success overlay ── */}
      {withdrawSuccess && (
        <div className="modal-backdrop" style={{ display: 'flex', zIndex: 999 }}>
          <div className="modal-dialog" style={{ maxWidth: 480, textAlign: 'center', padding: '2.5rem 2rem', background: '#ffffff', borderRadius: 16 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', fontFamily: 'inherit' }}>
              Withdrawal Request Received Successfully
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your funds are being processed and will be sent to your M-Pesa line in <strong>less than 20 minutes</strong>.<br /><br />
              If funds have not arrived after 20 minutes, please contact our support team.
            </p>
            <button type="button" className="btn-submit" onClick={closeSuccessOverlay} style={{ maxWidth: 240, margin: '0 auto' }}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
