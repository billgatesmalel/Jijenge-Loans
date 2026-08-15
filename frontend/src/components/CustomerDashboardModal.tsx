import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Home, Info, HelpCircle, MessageCircle,
  ClipboardList, ArrowRight, Menu, X, Lock, AlertCircle
} from 'lucide-react';
import { Footer } from './Footer';

interface CustomerDashboardProps {
  onClose: () => void;
  onOpenSupport?: () => void;
}

export const CustomerDashboardModal: React.FC<CustomerDashboardProps> = ({ onClose, onOpenSupport }) => {
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

  // Custom Cooldown & Validation states
  const [phoneError, setPhoneError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const validatePhoneNumber = (num: string): boolean => {
    const regex = /^(?:\+254|254|0)?([71]\d{8})$/;
    return regex.test(num.trim());
  };

  useEffect(() => {
    const token = sessionStorage.getItem('bl_customer_token');
    const storedRole = sessionStorage.getItem('bl_customer_role') || 'CUSTOMER';
    if (token) {
      setIsLoggedIn(true);
      setUserRole(storedRole);
      loadDashboardData(token);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('bl_resend_timestamp');
    if (stored) {
      const elapsed = Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
      const remaining = 60 - elapsed;
      if (remaining > 0) {
        setResendCooldown(remaining);
      } else {
        localStorage.removeItem('bl_resend_timestamp');
      }
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('bl_resend_timestamp');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    if (loginLoading) return;
    setError('');
    setPhoneError('');
    setResendSent(false);

    if (!phone.trim()) {
      setPhoneError('Registered M-Pesa phone number is required.');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setPhoneError('Please enter a valid M-Pesa phone number (e.g. 07XXXXXXXX)');
      return;
    }
    if (!pin.trim()) {
      setError('Security PIN is required.');
      return;
    }

    setLoginLoading(true);
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
    setError('');
    setPhoneError('');
    setResendSent(false);

    if (!phone.trim()) {
      setPhoneError('Please enter your M-Pesa phone number first.');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setPhoneError('Please enter a valid M-Pesa phone number (e.g. 07XXXXXXXX)');
      return;
    }
    if (resendCooldown > 0) return;

    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/customer/resend-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendSent(true);
        localStorage.setItem('bl_resend_timestamp', Date.now().toString());
        setResendCooldown(60);
      } else {
        setError(data.message || "We couldn't send the PIN right now. Please try again later.");
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
    e.target.style.borderColor = '#e2e8f0'; // var(--border-light)
    e.target.style.boxShadow = 'none';
  };

  /* ─── Nav links config ─── */
  const navLinks = [
    { label: 'Home', hash: 'home', icon: <Home size={14} /> },
    { label: 'How It Works', hash: 'how-it-works', icon: <Info size={14} /> },
    { label: 'FAQs', hash: 'faqs', icon: <HelpCircle size={14} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', boxSizing: 'border-box' }}>
      <style>{`
        .login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border: 1px solid var(--border-light);
          padding: 2.5rem 2rem;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          box-sizing: border-box;
        }
        @media (max-width: 480px) {
          .login-card {
            padding: 1.75rem 1.25rem !important;
            border-radius: var(--radius-lg) !important;
          }
        }
      `}</style>

      {/* HEADER — standardized with Jijenge Loans navbar */}
      <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} role="banner">
        <div className="nav-container">
          {/* Brand */}
          <a
            href="#home"
            className="nav-brand"
            onClick={(e) => { e.preventDefault(); onClose(); }}
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

          {/* Desktop nav links */}
          <nav className="nav-links" aria-label="Main navigation">
            <a
              href="#home"
              className="nav-link"
              onClick={(e) => { e.preventDefault(); onClose(); }}
            >
              Home
            </a>
            <a
              href="#how-it-works"
              className="nav-link"
              onClick={(e) => { e.preventDefault(); onClose(); }}
            >
              How It Works
            </a>
            <a
              href="#faqs"
              className="nav-link"
              onClick={(e) => { e.preventDefault(); onClose(); }}
            >
              FAQs
            </a>
            <button
              type="button"
              className="nav-link"
              onClick={() => { if (onOpenSupport) onOpenSupport(); else onClose(); }}
            >
              Support
            </button>
            <a
              href="#track"
              className="nav-link"
              onClick={(e) => { e.preventDefault(); onClose(); }}
            >
              <ClipboardList size={14} strokeWidth={1.8} aria-hidden="true" />
              Track Loan
            </a>
          </nav>

          {/* Desktop right actions */}
          <div className="nav-actions" role="group" aria-label="Account actions">
            {isLoggedIn && isAdmin && (
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                className="btn-nav-outline"
                style={{
                  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                }}
              >
                ⚡ Admin Panel
              </button>
            )}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-nav-outline"
              >
                Sign Out
              </button>
            ) : (
              <>
                <a href="#customer" className="btn-nav-outline nav-link--active">
                  Customer Login
                </a>
                <button
                  type="button"
                  className="btn-apply-cta"
                  onClick={onClose}
                >
                  Apply Now
                  <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="nav-hamburger"
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileNavOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        id="mobile-nav-drawer"
        className={`mobile-drawer${mobileNavOpen ? ' mobile-drawer--open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="mobile-drawer-inner">
          <a
            href="#home"
            className="mobile-nav-link"
            onClick={() => { onClose(); setMobileNavOpen(false); }}
          >
            Home
          </a>
          <a
            href="#how-it-works"
            className="mobile-nav-link"
            onClick={() => { onClose(); setMobileNavOpen(false); }}
          >
            How It Works
          </a>
          <a
            href="#faqs"
            className="mobile-nav-link"
            onClick={() => { onClose(); setMobileNavOpen(false); }}
          >
            FAQs
          </a>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => { if (onOpenSupport) onOpenSupport(); else onClose(); setMobileNavOpen(false); }}
          >
            <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
            Support Chat
          </button>

          <hr className="mobile-nav-divider" />

          <a
            href="#track"
            className="mobile-nav-link"
            onClick={() => { onClose(); setMobileNavOpen(false); }}
          >
            <ClipboardList size={15} strokeWidth={1.8} aria-hidden="true" />
            Track Loan
          </a>

          {isLoggedIn ? (
            <button
              type="button"
              className="mobile-nav-link"
              onClick={() => { handleLogout(); setMobileNavOpen(false); }}
            >
              Sign Out
            </button>
          ) : (
            <>
              <a
                href="#customer"
                className="mobile-nav-link mobile-nav-link--active"
                onClick={() => setMobileNavOpen(false)}
              >
                Customer Login
              </a>
              <button
                type="button"
                className="btn-apply-cta mobile-apply-btn"
                onClick={() => { onClose(); setMobileNavOpen(false); }}
              >
                Apply Now
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>



      {/* MAIN CONTENT AREA */}
      <main className={`flex-grow flex items-center justify-center p-6 w-full ${isLoggedIn ? 'max-w-[900px] mx-auto' : ''}`}>
        {!isLoggedIn ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-9 shadow-lg max-w-[440px] w-full">
            {/* Icon + heading */}
            <div className="text-center mb-6">
              <div className="bg-[#FFF5ED] text-[#FF6600] border border-[#FFD6B3] w-12 h-12 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
                🔐
              </div>
              <h2 className="text-xl font-extrabold text-brand-navy mb-1">
                Customer Portal Login
              </h2>
              <p className="text-xs text-slate-500 m-0 leading-relaxed">
                Access your allocated loan balance &amp; withdraw to M-Pesa
              </p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              {/* Phone */}
              <div className="mb-4">
                <label htmlFor="customer-phone" className="jijenge-label">
                  Registered M-Pesa Phone Number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError('');
                    setError('');
                    setResendSent(false);
                  }}
                  className={`jijenge-input ${phoneError ? 'jijenge-input-error' : ''}`}
                  required
                />
                {phoneError && (
                  <div className="text-red-500 text-xs mt-1.5 font-semibold">
                    {phoneError}
                  </div>
                )}
              </div>

              {/* PIN with show/hide toggle */}
              <div className="mb-2">
                <label htmlFor="customer-pin" className="jijenge-label">
                  Security PIN
                </label>
                <div className="relative">
                  <input
                    id="customer-pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setError('');
                      setResendSent(false);
                    }}
                    className="jijenge-input pr-12"
                    required
                  />
                  {/* Eye toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-none border-none p-1 cursor-pointer flex items-center transition-colors"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Resend PIN */}
              <div className="flex justify-end mb-6">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-slate-400 font-bold">
                    Resend PIN in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendPin}
                    disabled={resendLoading}
                    className="text-xs font-bold text-[#FF6600] hover:underline bg-none border-none p-0 cursor-pointer disabled:text-slate-400 disabled:no-underline"
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
                className="btn-primary w-full"
              >
                {loginLoading ? 'Verifying credentials...' : (
                  <>
                    <span>Verify Credentials</span>
                    <ArrowRight size={16} aria-hidden />
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="jijenge-alert jijenge-alert-error mt-4">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message for SMS */}
            {resendSent && (
              <div className="jijenge-alert jijenge-alert-success mt-4">
                <AlertCircle size={16} className="flex-shrink-0 text-emerald-600" />
                <span>PIN sent successfully. Check your phone for your new PIN.</span>
              </div>
            )}

            {/* Security footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <Lock size={12} className="text-emerald-500 flex-shrink-0" aria-hidden />
              <span>256-Bit SSL Encrypted Connection · ODPC Data Protected</span>
            </div>
          </div>
        ) : (
          /* ── PORTAL DASHBOARD (logged in) ── */
          userData && (
            <div className="bg-white border border-slate-200 p-6 sm:p-9 rounded-3xl shadow-md w-full">
              {/* Welcome header */}
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 pb-5 mb-6">
                <div>
                  <h2 id="welcome-name" className="text-xl sm:text-2xl font-black text-brand-navy mt-0 mb-1 tracking-tight">
                    Welcome, {userData.fullName}!
                  </h2>
                  <p id="welcome-phone" className="text-xs sm:text-sm text-slate-500 font-bold m-0">
                    📱 {userData.phoneNumber} {latestLoan && `| Ref: ${latestLoan.transactionRef}`}
                  </p>
                </div>
                {latestLoan && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Loan Status</span>
                    <span className={`jijenge-badge jijenge-badge-${
                      latestLoan.status.toLowerCase().includes('disbursed') || latestLoan.status.toLowerCase().includes('approved') || latestLoan.status.toLowerCase().includes('paid') || latestLoan.status.toLowerCase().includes('complete')
                        ? 'success'
                        : latestLoan.status.toLowerCase().includes('rejected') || latestLoan.status.toLowerCase().includes('failed') || latestLoan.status.toLowerCase().includes('cancel')
                          ? 'error'
                          : 'warning'
                    } px-3 py-1.5`}>
                      {latestLoan.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[11px] text-emerald-800 font-bold tracking-wider uppercase block mb-1">Allocated Loan Balance</span>
                  <strong className="text-xl sm:text-2xl font-black text-emerald-800">KES {allocatedBalance.toLocaleString()}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[11px] text-slate-500 font-bold tracking-wider uppercase block mb-1">M-Pesa Disbursal Fee</span>
                  <strong className="text-xl sm:text-2xl font-black text-slate-700">KES {formattedFee.toLocaleString()}</strong>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[11px] text-sky-800 font-bold tracking-wider uppercase block mb-1">Amount You Will Receive</span>
                  <strong className="text-xl sm:text-2xl font-black text-sky-800">KES {allocatedBalance.toLocaleString()}</strong>
                </div>
              </div>

              {/* Withdraw panel */}
              {latestLoan && allocatedBalance > 0 && (
                <div className="jijenge-alert jijenge-alert-info flex-col p-6 mb-8">
                  <h3 className="text-base font-extrabold text-sky-800 mb-1.5">Withdraw Funds to M-Pesa</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                    Your matched loan is active and pre-approved for immediate cashout. Press the button below to initiate disbursal.
                  </p>
                  <button
                    type="button"
                    className="btn-primary w-full sm:max-w-[280px]"
                    onClick={handleWithdrawFunds}
                    disabled={withdrawLoading}
                  >
                    {withdrawLoading ? 'Initiating...' : '💸 Request Withdrawal to M-Pesa'}
                  </button>
                </div>
              )}

              {/* Withdrawal history */}
              <div>
                <h3 className="text-base font-black text-brand-navy mb-4">Withdrawal Transaction History</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                        {['Date Requested', 'Disbursed Amount', 'Withdrawal Fee', 'Transaction ID', 'Disbursal Status'].map(h => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {withdrawals.length > 0 ? withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">KES {w.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-600">KES {w.withdrawalFee.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{w.checkoutRequestId}</code>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`jijenge-badge jijenge-badge-${
                              w.status.toLowerCase().includes('success') || w.status.toLowerCase().includes('approved') || w.status.toLowerCase().includes('disbursed') || w.status.toLowerCase().includes('paid')
                                ? 'success'
                                : w.status.toLowerCase().includes('reject') || w.status.toLowerCase().includes('fail')
                                  ? 'error'
                                  : 'warning'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="text-center text-slate-400 py-8">
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
      </main>

      {!isLoggedIn && <Footer onTabChange={onClose} />}

      {/* ── Processing overlay ── */}
      {withdrawLoading && !withdrawSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-2xl max-w-[440px] w-full text-center">
            <div className="processing-box">
              <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-[#FF6600] animate-spin mx-auto mb-5" />
              <h3 className="text-lg font-black text-brand-navy mb-2">
                Initiating M-Pesa Withdrawal...
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
                Sending cashout prompt to <strong>{userData?.phoneNumber}</strong>. Enter your M-Pesa PIN to authorize withdrawal fee of <strong>KES {formattedFee.toLocaleString()}</strong>.
              </p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="bg-[#FF6600] h-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Success overlay ── */}
      {withdrawSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-2xl max-w-[480px] w-full text-center">
            <div className="text-5xl mb-5">🎉</div>
            <h2 className="text-xl sm:text-2xl font-black text-brand-navy mb-3">
              Withdrawal Request Received!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Your funds are being processed and will be sent to your M-Pesa line in <strong>less than 20 minutes</strong>.<br /><br />
              If funds have not arrived after 20 minutes, please contact our support team.
            </p>
            <button type="button" className="btn-primary w-full max-w-[240px] mx-auto block" onClick={closeSuccessOverlay}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
