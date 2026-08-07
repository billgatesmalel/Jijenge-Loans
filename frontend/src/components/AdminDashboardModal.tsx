import React, { useState, useEffect } from 'react';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  /**
   * Track whether the admin arrived via the "Switch to Admin Panel" button
   * from the Customer Dashboard (using bl_customer_token). This controls
   * whether "Back to Customer Dashboard" is shown and which token is used.
   */
  const [arrivedViaSwitch, setArrivedViaSwitch] = useState(false);

  // Sidebar navigation
  const [activeTab, setActiveTab] = useState<'applications' | 'analytics' | 'support'>('applications');

  // Admin Data states
  const [applications, setApplications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);

  // Selected details
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Forms state
  const [allocateAmount, setAllocateAmount] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [supportReply, setSupportReply] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Retrieve the best available token to use for admin API calls.
   * Priority: bl_customer_token (when ADMIN role) > bl_super_admin_token.
   */
  const getAdminToken = (): string | null => {
    const customerToken = sessionStorage.getItem('bl_customer_token');
    const customerRole  = sessionStorage.getItem('bl_customer_role');
    if (customerToken && (customerRole === 'ADMIN' || customerRole === 'SUPER_ADMIN')) {
      return customerToken;
    }
    return sessionStorage.getItem('bl_super_admin_token');
  };

  // On mount: check if an ADMIN-role customer session is already active
  useEffect(() => {
    const customerRole  = sessionStorage.getItem('bl_customer_role');
    const customerToken = sessionStorage.getItem('bl_customer_token');

    if (customerToken && (customerRole === 'ADMIN' || customerRole === 'SUPER_ADMIN')) {
      // Admin arrived via the Switch button — skip login form
      setIsAuth(true);
      setArrivedViaSwitch(true);
      fetchAdminData(customerToken);
      return;
    }

    // Fall back to the legacy super-admin token
    const superToken = sessionStorage.getItem('bl_super_admin_token');
    if (superToken) {
      setIsAuth(true);
      setArrivedViaSwitch(false);
      fetchAdminData(superToken);
    }
  }, []);

  // Poll chat support messages if selected
  useEffect(() => {
    let intervalId: any;
    if (isAuth && activeTab === 'support') {
      const token = getAdminToken();
      if (token) {
        intervalId = setInterval(() => {
          syncTickets(token);
        }, 5000);
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuth, activeTab, selectedTicket]);

  const fetchAdminData = async (token: string) => {
    try {
      const [appRes, anaRes, tickRes] = await Promise.all([
        fetch('/api/admin/applications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics',    { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/support/tickets',    { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (appRes.ok) {
        const appData = await appRes.json();
        setApplications(appData.items || appData.applications || []);
      }
      if (anaRes.ok) {
        const anaData = await anaRes.json();
        setAnalytics(anaData.metrics || anaData.analytics || null);
      }
      if (tickRes.ok) {
        const tickData = await tickRes.json();
        setTickets(tickData.tickets || []);
      }
    } catch (e) {
      console.error('Failed to fetch admin dashboard datasets:', e);
    }
  };

  const syncTickets = async (token: string) => {
    try {
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const tickData = await res.json();
        setTickets(tickData.tickets || []);
        if (selectedTicket) {
          const updatedTick = tickData.tickets.find((t: any) => t.id === selectedTicket.id);
          if (updatedTick) setSelectedTicket(updatedTick);
        }
      }
    } catch (e) {
      console.warn('Could not sync support conversations:', e);
    }
  };

  // Legacy email/password login (for direct #admin navigation without a switch session)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pass: password.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.accessToken) {
        sessionStorage.setItem('bl_super_admin_token', data.accessToken);
        setIsAuth(true);
        setArrivedViaSwitch(false);
        fetchAdminData(data.accessToken);
      } else {
        setLoginError(data.message || 'Access Denied. Check credentials and try again.');
      }
    } catch (err) {
      setLoginError('Gateway connectivity error. Please verify the backend status.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bl_super_admin_token');
    // Do NOT clear bl_customer_token / bl_customer_role — keep customer session
    setIsAuth(false);
    onClose();
  };

  /** Return to Customer Dashboard, preserving the session */
  const handleBackToCustomerDashboard = () => {
    window.location.hash = 'customer';
  };

  const handleAllocate = async (loanId: string) => {
    if (!allocateAmount) return;
    const token = getAdminToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/allocate-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          loanId,
          amount: parseFloat(allocateAmount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Loan balance allocation completed successfully!');
        setSelectedApp(null);
        setAllocateAmount('');
        fetchAdminData(token);
      } else {
        alert(data.message || 'Failed to allocate balance.');
      }
    } catch (e) {
      alert('Connection error. Failed to complete allocation.');
    }
  };

  const handleStatusChange = async (loanId: string) => {
    if (!newStatus) return;
    const token = getAdminToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          loanId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Application workflow status updated successfully!');
        setSelectedApp(null);
        setNewStatus('');
        fetchAdminData(token);
      } else {
        alert(data.message || 'Failed to update status.');
      }
    } catch (e) {
      alert('Connection error. Failed to update status.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportReply.trim() || !selectedTicket) return;
    const token = getAdminToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender: 'ADMIN',
          senderName: 'Admin Agent',
          text: supportReply.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSupportReply('');
        const t = getAdminToken();
        if (t) syncTickets(t);
      }
    } catch (err) {
      console.error('Failed to dispatch reply:', err);
    }
  };

  // Filters
  const filteredApplications = applications.filter((app: any) => {
    const term = searchQuery.toLowerCase();
    return (
      app.fullName.toLowerCase().includes(term) ||
      app.transactionRef.toLowerCase().includes(term) ||
      app.phoneNumber.includes(term) ||
      app.nationalId.includes(term)
    );
  });

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f8fafc', boxSizing: 'border-box' }}>
      {/* ── Admin Header ── */}
      <header className="admin-header">
        <div className="admin-brand">
          <div className="palpluss-brand-icon">🛡️</div>
          <span className="palpluss-brand-title" style={{ color: '#ffffff' }}>Jijenge Admin</span>
          <span className="admin-badge">Super Admin</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* ── Back to Customer Dashboard (visible only when arrived via switch) ── */}
          {isAuth && arrivedViaSwitch && (
            <button
              id="btn-back-to-customer"
              onClick={handleBackToCustomerDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.35)',
                padding: '0.45rem 1.05rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                transition: 'background 0.15s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              aria-label="Back to Customer Dashboard"
            >
              ← Back to Customer Dashboard
            </button>
          )}

          {isAuth && (
            <button
              onClick={handleLogout}
              style={{ background: '#be123c', color: '#ffffff', padding: '0.45rem 1.15rem', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1.5rem' }}>
        {/* ── LOGIN OVERLAY (shown when no admin session exists) ── */}
        {!isAuth ? (
          <div style={{ maxWidth: '420px', margin: '4rem auto', background: '#ffffff', border: '1px solid #cbd5e1', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 0.5rem auto' }}>🔐</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Admin Portal</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Enter admin credentials to access the control panel</p>
            </div>

            <form onSubmit={handleAdminLogin}>
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Admin Email</label>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>Security Password</label>
                <input
                  id="admin-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <button
                type="submit"
                id="btn-admin-login"
                disabled={loginLoading}
                style={{ width: '100%', padding: '0.85rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
              >
                {loginLoading ? 'Verifying...' : 'Secure Authorization'}
              </button>
            </form>

            {loginError && (
              <div style={{ marginTop: '1rem', background: '#fff1f2', border: '1px solid #fecaca', color: '#be123c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                {loginError}
              </div>
            )}
          </div>
        ) : (
          /* ── CONSOLE WORKSPACE ── */
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Sidebar nav */}
            <div className="admin-nav-tabs" style={{ height: 'auto', position: 'sticky', top: '90px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', padding: '0.5rem 0.95rem', display: 'block' }}>Control Core</span>
              <button
                onClick={() => { setActiveTab('applications'); setSelectedApp(null); }}
                className={`admin-nav-tab ${activeTab === 'applications' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', outline: 'none' }}
              >
                📁 Applications Manager
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`admin-nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', outline: 'none' }}
              >
                📊 Analytics Engine
              </button>
              <button
                onClick={() => { setActiveTab('support'); setSelectedTicket(null); }}
                className={`admin-nav-tab ${activeTab === 'support' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', outline: 'none' }}
              >
                💬 Support Console ({tickets.filter(t => t.status === 'OPEN').length})
              </button>
            </div>

            {/* Content pane */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>

              {/* APPLICATIONS TAB */}
              {activeTab === 'applications' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Application Approvals</h2>
                    <input
                      type="text"
                      placeholder="🔍 Search name, ID, phone, ref..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', width: '280px', outline: 'none' }}
                    />
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Ref</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Full Name</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Phone Number</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>National ID</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Matched Offer</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Alloc Balance</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Fee Status</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Status</th>
                          <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#475569' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApplications.length > 0 ? (
                          filteredApplications.map((app) => (
                            <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800 }}>{app.transactionRef}</td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{app.fullName}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{app.phoneNumber}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>{app.nationalId}</td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>KES {app.amount.toLocaleString()}</td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#047857' }}>KES {(app.allocatedBalance || 0).toLocaleString()}</td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: app.feeStatus === 'Paid' ? '#047857' : '#b45309'
                                }}>
                                  {app.feeStatus}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: app.status.includes('Disbursed') || app.status.includes('Approved') ? '#047857' : '#b45309',
                                }}>
                                  {app.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <button
                                  onClick={() => setSelectedApp(app)}
                                  style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No applications registered matching query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Manage application drawer */}
                  {selectedApp && (
                    <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1.5px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                          Manage: {selectedApp.fullName} ({selectedApp.transactionRef})
                        </h3>
                        <button
                          onClick={() => setSelectedApp(null)}
                          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 800 }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {/* Allocate Balance */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '1.25rem', borderRadius: '10px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#4f46e5', marginBottom: '0.75rem' }}>
                            Allocate Loan Limit Balance
                          </h4>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="number"
                              placeholder="Allocate KSh"
                              value={allocateAmount}
                              onChange={(e) => setAllocateAmount(e.target.value)}
                              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                            />
                            <button
                              onClick={() => handleAllocate(selectedApp.id)}
                              style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Allocate
                            </button>
                          </div>
                        </div>

                        {/* Change workflow status */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '1.25rem', borderRadius: '10px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '0.75rem' }}>
                            Change Workflow Status
                          </h4>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                            >
                              <option value="">Select Status</option>
                              <option value="Initial_Verification">Initial Verification</option>
                              <option value="Credit_Assessment">Credit Assessment</option>
                              <option value="Approved">Approved / Allocated</option>
                              <option value="Disbursed">Disbursed Funds</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                            <button
                              onClick={() => handleStatusChange(selectedApp.id)}
                              style={{ background: '#f59e0b', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === 'analytics' && (
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a' }}>System Metrics Analytics</h2>

                  {analytics ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '1.5rem', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Total Applications</span>
                        <strong style={{ fontSize: '2rem', color: '#16a34a', fontWeight: 800 }}>{analytics.totalApplications}</strong>
                      </div>
                      <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', padding: '1.5rem', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Disbursed Balance</span>
                        <strong style={{ fontSize: '1.75rem', color: '#059669', fontWeight: 800 }}>KES {(analytics.totalAllocated || analytics.totalAllocatedBalance || 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '1.5rem', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Paid Processing Fees</span>
                        <strong style={{ fontSize: '1.75rem', color: '#2563eb', fontWeight: 800 }}>KES {(analytics.totalRevenue || analytics.totalFeesPaid || 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', padding: '1.5rem', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Conversion Rate</span>
                        <strong style={{ fontSize: '1.75rem', color: '#d97706', fontWeight: 800 }}>{analytics.conversionRate || 0}%</strong>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#64748b' }}>Generating real-time analytics reports...</p>
                  )}
                </div>
              )}

              {/* SUPPORT CONSOLE TAB */}
              {activeTab === 'support' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
                  {/* Conversations list */}
                  <div style={{ borderRight: '1px solid #cbd5e1', paddingRight: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>Live Chat Tickets</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tickets.length > 0 ? (
                        tickets.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTicket(t)}
                            style={{
                              padding: '0.85rem',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: selectedTicket && selectedTicket.id === t.id ? '#f0f4ff' : '#ffffff',
                              borderLeft: t.status === 'OPEN' ? '4px solid #4f46e5' : '1.5px solid #cbd5e1',
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{t.customerName}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>📞 {t.customerPhone}</div>
                            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.subject}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No chat tickets found.</p>
                      )}
                    </div>
                  </div>

                  {/* Messaging timeline */}
                  <div>
                    {selectedTicket ? (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '480px' }}>
                        {/* Chat header */}
                        <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                          <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{selectedTicket.customerName}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Phone: {selectedTicket.customerPhone} | Subject: {selectedTicket.subject}
                          </div>
                        </div>

                        {/* Message log */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {selectedTicket.messages && selectedTicket.messages.map((m: any) => {
                            const isAdmin = m.sender === 'ADMIN';
                            return (
                              <div
                                key={m.id}
                                style={{
                                  alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                  background: isAdmin ? '#4f46e5' : '#f1f5f9',
                                  color: isAdmin ? '#ffffff' : '#0f172a',
                                  padding: '0.65rem 1rem',
                                  borderRadius: '12px',
                                  maxWidth: '75%',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                }}
                              >
                                <div style={{ fontSize: '0.85rem' }}>{m.text}</div>
                                <span style={{ fontSize: '0.65rem', opacity: 0.7, float: 'right', marginTop: '0.2rem' }}>
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Reply input */}
                        <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <input
                            type="text"
                            placeholder="Type support reply..."
                            value={supportReply}
                            onChange={(e) => setSupportReply(e.target.value)}
                            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none' }}
                          />
                          <button
                            type="submit"
                            style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Send
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '8rem 0', color: '#94a3b8' }}>
                        Select a chat ticket from the list to view history and reply.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
