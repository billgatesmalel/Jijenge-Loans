import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, AlertCircle, ArrowRight, CreditCard, CheckCircle
} from 'lucide-react';

export const CustomerPage: React.FC = () => {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [error, setError] = useState('');

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
  };

  const handleSwitchToAdmin = () => { navigate('/super-admin'); };

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

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const formattedFee = Math.round(allocatedBalance * 0.02) || 50;

  return (
    <div className="customer-portal-page py-12">
      <div className="container">
        {!isLoggedIn ? (
          <>
            {/* Page Header */}
            <div className="section-title-wrap text-center" style={{ marginBottom: '2.5rem' }}>
              <span className="sub-tag">CUSTOMER PORTAL</span>
              <h1 className="section-heading">Access Your Loan Account</h1>
              <p className="section-subheading" style={{ maxWidth: '580px', margin: '0 auto' }}>
                Securely access your allocated loan balance, track your application, and manage your M-Pesa withdrawals.
              </p>
            </div>

            {/* Login Card */}
            <div className="customer-login-card">
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'var(--brand-orange-light)',
                    color: 'var(--brand-orange)',
                    border: '1px solid #FFD6B3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  🔐
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-navy)', margin: '0 0 0.25rem' }}>
                  Account Verification
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Enter your registered details to access your account
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} noValidate>
                {/* Registered Phone */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="customer-phone" className="jijenge-label">
                    Registered M-Pesa Phone Number <span className="required-star">*</span>
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
                  {phoneError && <span className="form-field-error">{phoneError}</span>}
                </div>

                {/* Security PIN */}
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor="customer-pin" className="jijenge-label">
                    Security PIN <span className="required-star">*</span>
                  </label>
                  <div className="pin-input-wrap">
                    <input
                      id="customer-pin"
                      type={showPin ? 'text' : 'password'}
                      placeholder="Enter 4-digit PIN"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setError('');
                        setResendSent(false);
                      }}
                      className="jijenge-input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      className="pin-toggle-btn"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Resend PIN action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                  {resendCooldown > 0 ? (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                      Resend PIN in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendPin}
                      disabled={resendLoading}
                      className="btn-text-action"
                    >
                      {resendLoading ? 'Sending PIN...' : 'Resend PIN via SMS'}
                    </button>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  id="btn-customer-login"
                  disabled={loginLoading}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loginLoading ? (
                    <span>Verifying credentials...</span>
                  ) : (
                    <>
                      <span>Verify Credentials</span>
                      <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="jijenge-alert jijenge-alert-error" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message for SMS */}
              {resendSent && (
                <div className="jijenge-alert jijenge-alert-success" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
                  <CheckCircle size={18} style={{ flexShrink: 0, color: '#059669' }} />
                  <span>PIN sent successfully via SMS. Check your phone.</span>
                </div>
              )}

              {/* Security reassurance */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <Lock size={14} style={{ color: 'var(--brand-emerald)', flexShrink: 0 }} aria-hidden="true" />
                <span>256-Bit SSL Encrypted Connection · ODPC Protected</span>
              </div>
            </div>
          </>
        ) : (
          /* ── LOGGED IN DASHBOARD VIEW ── */
          userData && (
            <div className="apply-step-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              {/* Welcome Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--brand-navy)', margin: '0 0 0.25rem' }}>
                    Welcome back, {userData.fullName}!
                  </h1>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>
                    📱 Phone: {userData.phoneNumber} {latestLoan && `| Ref: ${latestLoan.transactionRef}`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSwitchToAdmin}
                      className="btn-secondary"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      ⚡ Admin Panel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Balance Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '16px', padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                    Allocated Loan Balance
                  </span>
                  <strong style={{ fontSize: '1.65rem', fontWeight: 900, color: '#065F46' }}>
                    KES {allocatedBalance.toLocaleString()}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                    M-Pesa Disbursal Fee
                  </span>
                  <strong style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--brand-navy)' }}>
                    KES {formattedFee.toLocaleString()}
                  </strong>
                </div>

                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '16px', padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#0369A1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                    Amount You Receive
                  </span>
                  <strong style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0369A1' }}>
                    KES {allocatedBalance.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Withdrawal Request Banner */}
              {latestLoan && allocatedBalance > 0 && (
                <div className="jijenge-alert jijenge-alert-info" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0369a1', margin: '0 0 0.35rem' }}>
                    Withdraw Funds to M-Pesa
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                    Your matched loan is active and pre-approved for immediate cashout. Press the button below to disburse KES {allocatedBalance.toLocaleString()} directly to your M-Pesa line.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleWithdrawFunds}
                    disabled={withdrawLoading}
                    style={{ padding: '0.85rem 1.75rem' }}
                  >
                    <CreditCard size={18} aria-hidden="true" />
                    <span>{withdrawLoading ? 'Initiating Disbursal...' : '💸 Request Withdrawal to M-Pesa'}</span>
                  </button>
                </div>
              )}

              {/* Transaction History */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: '1rem' }}>
                  Withdrawal Transaction History
                </h3>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Amount</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Fee</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Transaction ID</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length > 0 ? (
                        withdrawals.map((w) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--brand-navy)' }}>
                              {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
                              KES {w.amount.toLocaleString()}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-body)' }}>
                              KES {w.withdrawalFee.toLocaleString()}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#475569' }}>
                                {w.checkoutRequestId}
                              </code>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
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

      {/* Withdrawal Overlays */}
      {withdrawLoading && !withdrawSuccess && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#FF6600', animation: 'spin 1s linear infinite', margin: '0 auto 1.25rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: '0.5rem' }}>
              Initiating M-Pesa Withdrawal...
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Sending cashout prompt to <strong>{userData?.phoneNumber}</strong>. Enter your M-Pesa PIN to authorize withdrawal.
            </p>
            <div style={{ height: '8px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ background: '#FF6600', height: '100%', width: '60%', transition: 'width 300ms ease' }} />
            </div>
          </div>
        </div>
      )}

      {withdrawSuccess && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              Withdrawal Request Received!
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your funds are being processed and will be sent to your M-Pesa line in <strong>less than 20 minutes</strong>.<br /><br />
              If funds have not arrived after 20 minutes, please contact our support team.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', maxWidth: '240px', margin: '0 auto', display: 'block' }}
              onClick={closeSuccessOverlay}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPage;
