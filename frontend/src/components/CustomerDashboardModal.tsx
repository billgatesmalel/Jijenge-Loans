import React, { useState, useEffect } from 'react';

interface CustomerDashboardProps {
  onClose: () => void;
}

export const CustomerDashboardModal: React.FC<CustomerDashboardProps> = ({ onClose }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // User role — read from sessionStorage for persistence across re-renders
  const [userRole, setUserRole] = useState<string>('CUSTOMER');

  // Dashboard details
  const [userData, setUserData] = useState<any>(null);
  const [latestLoan, setLatestLoan] = useState<any>(null);
  const [allocatedBalance, setAllocatedBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Action states
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Check login on load
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
        if (data.latestLoan && data.latestLoan.withdrawals) {
          setWithdrawals(data.latestLoan.withdrawals);
        }
      } else {
        // Token expired
        sessionStorage.removeItem('bl_customer_token');
        sessionStorage.removeItem('bl_customer_role');
        setIsLoggedIn(false);
      }
    } catch (e) {
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
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoginLoading(false);
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

  /**
   * Admin Switch: navigate to Admin Dashboard while preserving the session.
   * The AdminDashboard will detect bl_customer_token + bl_customer_role=ADMIN
   * and skip its own login form.
   */
  const handleSwitchToAdmin = () => {
    window.location.hash = 'admin';
  };

  const handleWithdrawFunds = async () => {
    if (!latestLoan || allocatedBalance <= 0) return;
    const token = sessionStorage.getItem('bl_customer_token');
    if (!token) return;

    setWithdrawLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customer/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          loanId: latestLoan.id,
          amount: allocatedBalance,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawSuccess(true);
        setTimeout(() => {
          loadDashboardData(token);
        }, 1500);
      } else {
        setError(data.message || 'Failed to submit withdrawal request.');
        setWithdrawLoading(false);
      }
    } catch (err) {
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
    if (s.includes('review') || s.includes('process') || s.includes('pending')) {
      return 'badge-review';
    } else if (s.includes('approved') || s.includes('active') || s.includes('paid')) {
      return 'badge-approved';
    } else if (s.includes('disbursed')) {
      return 'badge-disbursed';
    }
    return 'badge-failed';
  };

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const formattedFee = Math.round(allocatedBalance * 0.02) || 50;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f8fafc', boxSizing: 'border-box' }}>
      {/* ── Top Header ── */}
      <header className="cust-header" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', width: '100%' }}>
        <div className="cust-nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>
          <a href="#home" className="cust-brand" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', color: '#0f172a', fontWeight: 800, fontSize: '1.2rem' }}>
            <img src="/logo.png" alt="Jijenge Loans" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
            <span>Jijenge Loans</span>
          </a>

          <div className="cust-nav-links" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a href="#home" className="cust-nav-link" onClick={onClose} style={{ color: '#64748b', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>Home</a>

            {/* ── Admin Switch Button — visible ONLY for ADMIN-role accounts ── */}
            {isLoggedIn && isAdmin && (
              <button
                type="button"
                id="btn-switch-to-admin"
                onClick={handleSwitchToAdmin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 1.05rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
                  transition: 'opacity 0.15s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                aria-label="Switch to Admin Panel"
              >
                ⚡ Switch to Admin Panel
              </button>
            )}

            {isLoggedIn && (
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <div style={{ maxWidth: '900px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
        {/* LOGIN FORM (Not Logged In) */}
        {!isLoggedIn ? (
          <div className="portal-card" style={{ maxWidth: '440px', margin: '0 auto', background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '2.5rem 2rem', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', fontSize: '1.5rem', margin: '0 auto 0.75rem auto', justifyContent: 'center' }}>🔐</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>Customer Portal Login</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Access your allocated loan balance &amp; withdraw to M-Pesa</p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>Registered M-Pesa Phone Number</label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1.1rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>Security PIN</label>
                <input
                  id="customer-pin"
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1.1rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <button
                type="submit"
                id="btn-customer-login"
                className="btn-submit"
                disabled={loginLoading}
                style={{ width: '100%', background: '#0284c7', color: '#ffffff', padding: '0.85rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)' }}
              >
                {loginLoading ? 'Verifying...' : 'Verify Credentials'}
              </button>
            </form>

            {error && (
              <div style={{ marginTop: '1.25rem', background: '#fef2f2', border: '1.5px solid #fecaca', padding: '0.85rem 1.1rem', borderRadius: '12px', color: '#991b1b', fontSize: '0.88rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>
        ) : (
          /* PORTAL DASHBOARD (Logged In) */
          userData && (
            <div className="portal-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h2 id="welcome-name" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                    Welcome, {userData.fullName}!
                  </h2>
                  <p id="welcome-phone" style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
                    📱 Phone: {userData.phoneNumber} {latestLoan && `| Ref: ${latestLoan.transactionRef}`}
                  </p>
                </div>

                {latestLoan && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Loan Status</span>
                    <span className={`badge-status ${getStatusBadgeClass(latestLoan.status)}`} style={{ padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.825rem', fontWeight: 800 }}>
                      {latestLoan.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance Cards Row */}
              <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div className="dash-card card-allocated" style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '16px', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Allocated Loan Balance</span>
                  <strong style={{ fontSize: '1.75rem', color: '#047857', fontWeight: 800 }}>
                    KES {allocatedBalance.toLocaleString()}
                  </strong>
                </div>

                <div className="dash-card card-fee" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>M-Pesa Disbursal Fee</span>
                  <strong style={{ fontSize: '1.75rem', color: '#475569', fontWeight: 800 }}>
                    KES {formattedFee.toLocaleString()}
                  </strong>
                </div>

                <div className="dash-card card-receive" style={{ background: '#f0f9ff', border: '1.5px solid #38bdf8', borderRadius: '16px', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Amount You Will Receive</span>
                  <strong style={{ fontSize: '1.75rem', color: '#0369a1', fontWeight: 800 }}>
                    KES {allocatedBalance.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Withdraw Action panel */}
              {latestLoan && allocatedBalance > 0 && (
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.5rem 0' }}>
                    Withdraw Funds to M-Pesa
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#475569', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                    Your matched loan is active and pre-approved for immediate cashout. Press the button below to initiate disbursal.
                  </p>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleWithdrawFunds}
                    disabled={withdrawLoading}
                    style={{ maxWidth: '280px', margin: 0 }}
                  >
                    {withdrawLoading ? 'Initiating...' : '💸 Request Withdrawal to M-Pesa'}
                  </button>
                </div>
              )}

              {/* Withdrawal History Table */}
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                  Withdrawal Transaction History
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#edf2f5', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Date Requested</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Disbursed Amount</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Withdrawal Fee</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Transaction ID</th>
                        <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Disbursal Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length > 0 ? (
                        withdrawals.map((w) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.9rem 1rem', fontWeight: 500 }}>
                              {new Date(w.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '0.9rem 1rem', fontWeight: 800 }}>KES {w.amount.toLocaleString()}</td>
                            <td style={{ padding: '0.9rem 1rem' }}>KES {w.withdrawalFee.toLocaleString()}</td>
                            <td style={{ padding: '0.9rem 1rem' }}><code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{w.checkoutRequestId}</code></td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <span className={`badge-status ${getStatusBadgeClass(w.status)}`} style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
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

      {/* ── Withdrawal Processing Dialog ── */}
      {withdrawLoading && !withdrawSuccess && (
        <div className="modal-backdrop" style={{ display: 'flex', zIndex: 999 }}>
          <div className="modal-dialog" style={{ maxWidth: '440px', textAlign: 'center', padding: '2.5rem 1.75rem', background: '#ffffff', borderRadius: '16px' }}>
            <div className="processing-box">
              <div className="spinner-ring" style={{ width: '56px', height: '56px', borderWidth: '5px', borderTopColor: '#0284c7', margin: '0 auto 1.25rem auto' }}></div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                Initiating M-Pesa Withdrawal...
              </h3>
              <p className="processing-sub" style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                Sending cashout prompt to phone <strong>{userData?.phoneNumber}</strong>. Please enter your secret PIN to authorize withdrawal fee payment of <strong>KES {formattedFee.toLocaleString()}</strong>.
              </p>
              <div className="progress-bar-wrap" style={{ height: '10px', borderRadius: '5px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div className="progress-bar-fill" style={{ width: '60%', background: '#0284c7', height: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Withdrawal Success Dialog ── */}
      {withdrawSuccess && (
        <div className="modal-backdrop" style={{ display: 'flex', zIndex: 999 }}>
          <div className="modal-dialog" style={{ maxWidth: '480px', textAlign: 'center', padding: '2.5rem 2rem', background: '#ffffff', borderRadius: '16px' }}>
            <div className="success-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 className="success-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Withdrawal Request Received Successfully
            </h2>
            <div className="success-body" style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your withdrawal request has been received.<br /><br />
              Your funds are now being processed and will be sent to your registered M-Pesa number in <strong>less than 20 minutes</strong>.<br /><br />
              If your money has not arrived after 20 minutes, please contact our support team.
            </div>
            <button
              type="button"
              className="btn-submit"
              onClick={closeSuccessOverlay}
              style={{ maxWidth: '240px', margin: '0 auto' }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
