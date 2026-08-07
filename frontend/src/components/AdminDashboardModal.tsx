import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ClipboardList, DollarSign, Users, CreditCard,
  TrendingUp, BarChart2, Bell, MessageCircle, Settings, User,
  LogOut, Search, ChevronLeft, ChevronRight, Shield, CheckCircle,
  XCircle, Eye, AlertCircle, RefreshCcw, ArrowUpRight, Clock,
  Send, X, ChevronDown, FileText, Activity, ArrowLeft, Menu,
  Inbox, Edit3, Zap, Package, MoreHorizontal, Sliders
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

/* ── Status Badge Config ─────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Application_Received:    { label: 'Received',   color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  Initial_Verification:    { label: 'Verifying',  color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe' },
  Credit_Assessment:       { label: 'Assessment', color: '#5b21b6', bg: '#ede9fe', border: '#ddd6fe' },
  Loan_Review:             { label: 'In Review',  color: '#9a3412', bg: '#ffedd5', border: '#fed7aa' },
  Disbursement_In_Progress:{ label: 'Disbursing', color: '#065f46', bg: '#d1fae5', border: '#a7f3d0' },
  PENDING:    { label: 'Pending',   color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  APPROVED:   { label: 'Approved',  color: '#065f46', bg: '#d1fae5', border: '#a7f3d0' },
  REJECTED:   { label: 'Rejected',  color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
  DISBURSED:  { label: 'Disbursed', color: '#5b21b6', bg: '#ede9fe', border: '#ddd6fe' },
  COMPLETED:  { label: 'Completed', color: '#065f46', bg: '#d1fae5', border: '#a7f3d0' },
  CANCELLED:  { label: 'Cancelled', color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' },
};
const FEE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  Paid:    { label: 'Fee Paid',  color: '#065f46', bg: '#d1fae5' },
  Unpaid:  { label: 'Unpaid',    color: '#991b1b', bg: '#fee2e2' },
  Pending: { label: 'Processing',color: '#92400e', bg: '#fef3c7' },
};

/* ── Sidebar nav sections ─────────────────────────────────────── */
const NAV_SECTIONS = [
  { title: 'Overview',          items: [{ id: 'dashboard',     label: 'Dashboard',          icon: LayoutDashboard }] },
  { title: 'Loan Management',   items: [
      { id: 'applications', label: 'Loan Applications', icon: ClipboardList },
      { id: 'active-loans', label: 'Active Loans',      icon: DollarSign },
      { id: 'customers',    label: 'Customers',         icon: Users },
      { id: 'repayments',   label: 'Repayments',        icon: CreditCard },
  ]},
  { title: 'Insights',          items: [
      { id: 'analytics',    label: 'Analytics',         icon: TrendingUp },
      { id: 'reports',      label: 'Reports',           icon: BarChart2 },
  ]},
  { title: 'Communication',     items: [
      { id: 'notifications',label: 'Notifications',     icon: Bell },
      { id: 'support',      label: 'Support',           icon: MessageCircle },
  ]},
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);
const ORANGE = '#f97316';
const NAVY   = '#0c1e35';
const ITEMS_PER_PAGE = 10;

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export const AdminDashboardModal: React.FC<AdminDashboardProps> = ({ onClose }) => {

  /* ── Existing state (preserved exactly) ──────────────────── */
  const [isAuth,          setIsAuth]          = useState(false);
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [loginLoading,    setLoginLoading]    = useState(false);
  const [loginError,      setLoginError]      = useState('');
  const [arrivedViaSwitch,setArrivedViaSwitch]= useState(false);
  const [activeTab,       setActiveTab]       = useState('applications');
  const [applications,    setApplications]    = useState<any[]>([]);
  const [analytics,       setAnalytics]       = useState<any>(null);
  const [tickets,         setTickets]         = useState<any[]>([]);
  const [selectedApp,     setSelectedApp]     = useState<any>(null);
  const [selectedTicket,  setSelectedTicket]  = useState<any>(null);
  const [allocateAmount,  setAllocateAmount]  = useState('');
  const [newStatus,       setNewStatus]       = useState('');
  const [supportReply,    setSupportReply]    = useState('');
  const [searchQuery,     setSearchQuery]     = useState('');

  /* ── New UI state ──────────────────────────────────────────── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [sortField,        setSortField]        = useState('');
  const [sortDir,          setSortDir]          = useState<'asc'|'desc'>('asc');
  const [currentPage,      setCurrentPage]      = useState(1);
  const [dataLoading,      setDataLoading]      = useState(true);
  const [actionLoading,    setActionLoading]    = useState(false);
  const [toast,            setToast]            = useState('');

  const profileRef = useRef<HTMLDivElement>(null);

  /* ── Effects ─────────────────────────────────────────────── */
  useEffect(() => {
    const customerRole  = sessionStorage.getItem('bl_customer_role');
    const customerToken = sessionStorage.getItem('bl_customer_token');
    if (customerToken && (customerRole === 'ADMIN' || customerRole === 'SUPER_ADMIN')) {
      setIsAuth(true); setArrivedViaSwitch(true); fetchAdminData(customerToken); return;
    }
    const superToken = sessionStorage.getItem('bl_super_admin_token');
    if (superToken) { setIsAuth(true); setArrivedViaSwitch(false); fetchAdminData(superToken); }
    else setDataLoading(false);
  }, []);

  useEffect(() => {
    let id: any;
    if (isAuth && activeTab === 'support') {
      const token = getAdminToken();
      if (token) id = setInterval(() => syncTickets(token), 5000);
    }
    return () => { if (id) clearInterval(id); };
  }, [isAuth, activeTab, selectedTicket]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Business logic (preserved exactly) ─────────────────── */
  const getAdminToken = (): string | null => {
    const ct = sessionStorage.getItem('bl_customer_token');
    const cr = sessionStorage.getItem('bl_customer_role');
    if (ct && (cr === 'ADMIN' || cr === 'SUPER_ADMIN')) return ct;
    return sessionStorage.getItem('bl_super_admin_token');
  };

  const fetchAdminData = async (token: string) => {
    setDataLoading(true);
    try {
      const [appRes, anaRes, tickRes] = await Promise.all([
        fetch('/api/admin/applications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics',    { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/support/tickets',    { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (appRes.ok)  { const d = await appRes.json();  setApplications(d.items || d.applications || []); }
      if (anaRes.ok)  { const d = await anaRes.json();  setAnalytics(d.metrics || d.analytics || d || null); }
      if (tickRes.ok) { const d = await tickRes.json(); setTickets(d.tickets || []); }
    } catch (e) { console.error('Failed to fetch admin data:', e); }
    finally { setDataLoading(false); }
  };

  const syncTickets = async (token: string) => {
    try {
      const res = await fetch('/api/support/tickets', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json(); setTickets(d.tickets || []);
        if (selectedTicket) {
          const u = (d.tickets || []).find((t: any) => t.id === selectedTicket.id);
          if (u) setSelectedTicket(u);
        }
      }
    } catch { /* silent */ }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pass: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        sessionStorage.setItem('bl_super_admin_token', data.accessToken);
        setIsAuth(true); setArrivedViaSwitch(false); fetchAdminData(data.accessToken);
      } else {
        setLoginError(data.message || 'Access Denied. Check credentials and try again.');
      }
    } catch { setLoginError('Gateway connectivity error. Please verify the backend status.'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bl_super_admin_token');
    setIsAuth(false); onClose();
  };

  const handleBackToCustomerDashboard = () => { window.location.hash = 'customer'; };

  const handleAllocate = async (loanId: string) => {
    if (!allocateAmount) return;
    const token = getAdminToken(); if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/allocate-balance', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ loanId, amount: parseFloat(allocateAmount) }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Balance allocated successfully!');
        setSelectedApp(null); setAllocateAmount(''); fetchAdminData(token);
      } else { alert(data.message || 'Failed to allocate balance.'); }
    } catch { alert('Connection error.'); }
    finally { setActionLoading(false); }
  };

  const handleStatusChange = async (loanId: string) => {
    if (!newStatus) return;
    const token = getAdminToken(); if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ loanId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Status updated successfully!');
        setSelectedApp(null); setNewStatus(''); fetchAdminData(token);
      } else { alert(data.message || 'Failed to update status.'); }
    } catch { alert('Connection error.'); }
    finally { setActionLoading(false); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportReply.trim() || !selectedTicket) return;
    const token = getAdminToken(); if (!token) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sender: 'ADMIN', senderName: 'Admin Agent', text: supportReply.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) { setSupportReply(''); const t = getAdminToken(); if (t) syncTickets(t); }
    } catch (err) { console.error(err); }
  };

  /* ── UI helpers ──────────────────────────────────────────── */
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab); setSelectedApp(null); setSelectedTicket(null);
    setSearchQuery(''); setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const filteredApps = applications.filter((app: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (app.fullName || '').toLowerCase().includes(q)
      || (app.transactionRef || '').toLowerCase().includes(q)
      || (app.phoneNumber || '').includes(q)
      || (app.nationalId || '').includes(q);
  });

  const sortedApps = [...filteredApps].sort((a: any, b: any) => {
    if (!sortField) return 0;
    const cmp = String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedApps.length / ITEMS_PER_PAGE));
  const pagedApps = sortedApps.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const statusBadge = (s: string) => STATUS_CFG[s] || { label: s.replace(/_/g, ' '), color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' };
  const feeBadge    = (s: string) => FEE_CFG[s]    || { label: s || '—', color: '#374151', bg: '#f3f4f6' };

  const openTickets = tickets.filter((t: any) => t.status === 'OPEN').length;
  const kpis = {
    total:     applications.length,
    pending:   applications.filter(a => ['Application_Received','Initial_Verification','Credit_Assessment','Loan_Review'].includes(a.status)).length,
    approved:  applications.filter(a => ['APPROVED','Approved','Disbursement_In_Progress','DISBURSED','Disbursed'].includes(a.status)).length,
    rejected:  applications.filter(a => ['REJECTED','Rejected','CANCELLED'].includes(a.status)).length,
    disbursed: analytics?.totalAllocated || analytics?.totalAllocatedBalance || 0,
    revenue:   analytics?.totalRevenue   || analytics?.totalFeesPaid || 0,
    tickets:   openTickets,
    rate:      analytics?.conversionRate || 0,
  };

  const sidebarW = sidebarCollapsed ? '72px' : '260px';
  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const dateStr   = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ════════════════════════════════════════════════════════════
     LOGIN SCREEN
     ════════════════════════════════════════════════════════════ */
  if (!isAuth) {
    return (
      <div style={{
        minHeight: '100vh', width: '100%', boxSizing: 'border-box',
        background: `linear-gradient(135deg, ${NAVY} 0%, #1e3a5f 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(255,255,255,0.1)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem',
          borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit'
        }}>
          <ArrowLeft size={14} /> Home
        </button>

        <div style={{
          background: '#fff', borderRadius: '20px', padding: '2.5rem',
          width: '100%', maxWidth: '420px', boxShadow: '0 25px 60px rgba(0,0,0,0.45)'
        }}>
          {/* Brand mark */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '56px', height: '56px', background: ORANGE, borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(249,115,22,0.4)'
            }}>
              <Shield size={28} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem' }}>
              Jijenge Admin
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Sign in to the administrator control panel
            </p>
          </div>

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Admin Email
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input id="admin-email" type="email" placeholder="admin@jijengeloans.co.ke" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '0.78rem 0.9rem 0.78rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Shield size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input id="admin-password" type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', padding: '0.78rem 0.9rem 0.78rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <button id="btn-admin-login" type="submit" disabled={loginLoading} style={{
              width: '100%', padding: '0.875rem', background: loginLoading ? '#94a3b8' : ORANGE,
              color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700,
              cursor: loginLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              boxShadow: loginLoading ? 'none' : '0 4px 16px rgba(249,115,22,0.45)',
              transition: 'all 0.2s'
            }}>
              {loginLoading ? 'Verifying...' : 'Sign In to Admin Panel'}
            </button>
          </form>

          {loginError && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b',
              fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertCircle size={15} /> {loginError}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     MAIN DASHBOARD LAYOUT
     ════════════════════════════════════════════════════════════ */
  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100%', overflow: 'hidden',
      background: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif"
    }}>

      {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW, height: '100vh', background: NAVY,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        transition: 'width 0.25s ease, min-width 0.25s ease', zIndex: 50,
        borderRight: '1px solid rgba(255,255,255,0.05)'
      }}>
        {/* Brand header */}
        <div style={{
          display: 'flex', alignItems: 'center', height: '64px', padding: sidebarCollapsed ? '0' : '0 0.85rem',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, boxSizing: 'border-box'
        }}>
          {!sidebarCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', background: ORANGE, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={17} color="#fff" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1 }}>Jijenge Admin</div>
                  <div style={{ color: '#475569', fontSize: '0.65rem', lineHeight: 1.3 }}>Control Panel</div>
                </div>
              </div>
              <button onClick={() => setSidebarCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', borderRadius: '6px', display: 'flex' }}>
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarCollapsed(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <div style={{ width: '32px', height: '32px', background: ORANGE, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={17} color="#fff" />
              </div>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <div style={{ color: '#334155', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', padding: '0.9rem 1.1rem 0.3rem' }}>
                  {section.title}
                </div>
              )}
              {section.items.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => handleTabChange(item.id)} title={sidebarCollapsed ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                      padding: sidebarCollapsed ? '0.75rem 0' : '0.6rem 1.1rem',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      background: active ? 'rgba(249,115,22,0.13)' : 'transparent',
                      border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
                      outline: 'none'
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {active && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: '3px', background: ORANGE, borderRadius: '0 3px 3px 0' }} />}
                    <Icon size={18} color={active ? ORANGE : '#64748b'} style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && (
                      <span style={{ color: active ? '#f1f5f9' : '#94a3b8', fontSize: '0.86rem', fontWeight: active ? 600 : 400, flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                    {item.id === 'support' && openTickets > 0 && (
                      <span style={{
                        background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 700,
                        padding: '1px 5px', borderRadius: '10px', minWidth: '18px', textAlign: 'center', lineHeight: '16px',
                        position: sidebarCollapsed ? 'absolute' : 'static',
                        top: sidebarCollapsed ? '6px' : undefined, right: sidebarCollapsed ? '6px' : undefined,
                        marginLeft: sidebarCollapsed ? undefined : 'auto'
                      }}>
                        {openTickets}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer: logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: sidebarCollapsed ? '0.75rem 0' : '0.75rem 0.6rem', flexShrink: 0 }}>
          <button onClick={handleLogout} title={sidebarCollapsed ? 'Log Out' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: sidebarCollapsed ? '0.7rem 0' : '0.6rem 0.75rem',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start', borderRadius: '8px', transition: 'background 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <LogOut size={18} color="#ef4444" />
            {!sidebarCollapsed && <span style={{ color: '#ef4444', fontSize: '0.86rem', fontWeight: 600 }}>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ══ MAIN AREA ════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── TOP HEADER ── */}
        <header style={{
          height: '64px', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.5rem', flexShrink: 0, boxSizing: 'border-box',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', zIndex: 40
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '6px', borderRadius: '6px' }}>
                <Menu size={20} />
              </button>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {ALL_NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Dashboard'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>{dateStr}</p>
            </div>
          </div>

          {/* Center: Global search */}
          <div style={{ flex: 1, maxWidth: '360px', margin: '0 1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" placeholder="Search applications, customers..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); if (activeTab !== 'applications') handleTabChange('applications'); }}
                style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.2rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.84rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Notification */}
            <button style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.52rem', cursor: 'pointer', display: 'flex' }}>
              <Bell size={17} color="#64748b" />
              {openTickets > 0 && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />}
            </button>

            {/* Refresh */}
            <button onClick={() => { const t = getAdminToken(); if (t) fetchAdminData(t); }} title="Refresh data"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.52rem', cursor: 'pointer', display: 'flex' }}>
              <RefreshCcw size={17} color="#64748b" />
            </button>

            {/* Profile dropdown */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(!profileOpen)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.38rem 0.7rem', cursor: 'pointer'
              }}>
                <div style={{ width: '30px', height: '30px', background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>A</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Administrator</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>Super Admin</div>
                </div>
                <ChevronDown size={13} color="#94a3b8" />
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.13)', padding: '0.5rem', width: '220px', zIndex: 100
                }}>
                  <div style={{ padding: '0.5rem 0.75rem 0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Administrator</div>
                    <span style={{ display: 'inline-block', marginTop: '0.3rem', background: '#fff7ed', color: ORANGE, border: `1px solid #fed7aa`, fontSize: '0.68rem', fontWeight: 700, padding: '1px 8px', borderRadius: '20px' }}>
                      Super Admin
                    </span>
                  </div>

                  {arrivedViaSwitch && (
                    <button onClick={() => { setProfileOpen(false); handleBackToCustomerDashboard(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#4f46e5', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f5f3ff'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <ArrowLeft size={14} /> Back to Customer Dashboard
                    </button>
                  )}

                  <button onClick={() => { setProfileOpen(false); handleLogout(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── CONTENT AREA ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* ── Toast Notification ── */}
          {toast && (
            <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999, background: '#0f172a', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              <CheckCircle size={16} color="#10b981" /> {toast}
            </div>
          )}

          {/* ════ DASHBOARD OVERVIEW ════ */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Good {greeting}, Administrator 👋
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                  Here's your Jijenge Loans overview for today.
                </p>
              </div>

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Applications', value: kpis.total, icon: ClipboardList, color: '#3b82f6', bg: '#eff6ff', badge: 'All time' },
                  { label: 'Pending Reviews',    value: kpis.pending, icon: Clock, color: '#f59e0b', bg: '#fffbeb', badge: `${kpis.pending} active` },
                  { label: 'Approved Loans',     value: kpis.approved, icon: CheckCircle, color: '#10b981', bg: '#f0fdf4', badge: '+8%' },
                  { label: 'Rejected',           value: kpis.rejected, icon: XCircle, color: '#ef4444', bg: '#fef2f2', badge: '-3%' },
                  { label: 'Funds Disbursed',    value: `KES ${Number(kpis.disbursed).toLocaleString()}`, icon: DollarSign, color: '#8b5cf6', bg: '#f5f3ff', badge: 'Total' },
                  { label: 'Processing Fees',    value: `KES ${Number(kpis.revenue).toLocaleString()}`, icon: TrendingUp, color: ORANGE, bg: '#fff7ed', badge: 'Revenue' },
                  { label: 'Open Tickets',       value: kpis.tickets, icon: MessageCircle, color: '#0ea5e9', bg: '#f0f9ff', badge: 'Need reply' },
                  { label: 'Conversion Rate',    value: `${kpis.rate}%`, icon: Activity, color: '#10b981', bg: '#f0fdf4', badge: 'Approval' },
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                        <div style={{ width: '40px', height: '40px', background: kpi.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={20} color={kpi.color} />
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, background: '#f0fdf4', padding: '2px 8px', borderRadius: '20px' }}>
                          {kpi.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, marginBottom: '0.2rem' }}>
                        {dataLoading ? <div style={{ height: '26px', background: '#e2e8f0', borderRadius: '6px', width: '75%' }} /> : kpi.value}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{kpi.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Review Applications', tab: 'applications', icon: ClipboardList, c: ORANGE },
                    { label: 'View Analytics',      tab: 'analytics',    icon: TrendingUp,   c: '#3b82f6' },
                    { label: 'Support Tickets',     tab: 'support',      icon: MessageCircle,c: '#8b5cf6' },
                  ].map(qa => {
                    const Icon = qa.icon;
                    return (
                      <button key={qa.tab} onClick={() => handleTabChange(qa.tab)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', transition: 'all 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = qa.c; el.style.color = '#fff'; el.style.borderColor = qa.c; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#f8fafc'; el.style.color = '#334155'; el.style.borderColor = '#e2e8f0'; }}
                      >
                        <Icon size={15} /> {qa.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════ APPLICATIONS MANAGER ════ */}
          {activeTab === 'applications' && (
            <div>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.1rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Loan Applications</h2>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>{filteredApps.length} of {applications.length} applications</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="Search by applicant, phone, ID, reference..." value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      style={{ padding: '0.6rem 0.85rem 0.6rem 2.2rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.84rem', outline: 'none', width: '290px', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button onClick={() => { const t = getAdminToken(); if (t) fetchAdminData(t); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.9rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: '#475569', fontFamily: 'inherit' }}>
                    <RefreshCcw size={14} /> Refresh
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.855rem', minWidth: '860px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        {[
                          { label: 'Reference',    field: 'transactionRef' },
                          { label: 'Applicant',    field: 'fullName' },
                          { label: 'Phone',        field: 'phoneNumber' },
                          { label: 'National ID',  field: 'nationalId' },
                          { label: 'Loan Amount',  field: 'amount' },
                          { label: 'Allocated',    field: 'allocatedBalance' },
                          { label: 'Fee Status',   field: 'feeStatus' },
                          { label: 'Status',       field: 'status' },
                          { label: 'Actions',      field: null },
                        ].map(col => (
                          <th key={col.label}
                            onClick={col.field ? () => handleSort(col.field!) : undefined}
                            style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: col.field ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              {col.label}
                              {col.field && sortField === col.field && <span style={{ color: ORANGE }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} style={{ padding: '0.8rem 1rem' }}>
                                <div style={{ height: '13px', background: '#f1f5f9', borderRadius: '4px', width: j === 1 ? '110px' : '65px' }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : pagedApps.length > 0 ? pagedApps.map((app: any) => {
                        const sc = statusBadge(app.status);
                        const fc = feeBadge(app.feeStatus);
                        const isSelected = selectedApp?.id === app.id;
                        return (
                          <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#fff7ed' : 'transparent', transition: 'background 0.1s' }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                            onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '0.78rem' }}>{app.transactionRef}</span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{app.fullName}</div>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', color: '#475569' }}>{app.phoneNumber}</td>
                            <td style={{ padding: '0.8rem 1rem', color: '#475569' }}>{app.nationalId}</td>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#0f172a' }}>KES {Number(app.amount || 0).toLocaleString()}</td>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#065f46' }}>KES {Number(app.allocatedBalance || 0).toLocaleString()}</td>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, color: fc.color, background: fc.bg, whiteSpace: 'nowrap' }}>
                                {fc.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                                {sc.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <button onClick={() => setSelectedApp(isSelected ? null : app)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.38rem 0.7rem', background: isSelected ? ORANGE : '#f8fafc', color: isSelected ? '#fff' : '#475569', border: `1px solid ${isSelected ? ORANGE : '#e2e8f0'}`, borderRadius: '7px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                                <Sliders size={13} /> Manage
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={9}>
                            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                              <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <Inbox size={30} color="#94a3b8" />
                              </div>
                              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '0 0 0.35rem' }}>No Applications Found</h3>
                              <p style={{ color: '#64748b', margin: '0 0 1.25rem', fontSize: '0.875rem' }}>
                                Applications submitted by customers will appear here for review.
                              </p>
                              <button onClick={() => { setSearchQuery(''); const t = getAdminToken(); if (t) fetchAdminData(t); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit' }}>
                                <RefreshCcw size={14} /> Refresh
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!dataLoading && pagedApps.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.25rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedApps.length)} of {sortedApps.length}
                    </span>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        style={{ padding: '0.38rem 0.65rem', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '7px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : '#475569', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
                        ‹
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(pg => (
                        <button key={pg} onClick={() => setCurrentPage(pg)}
                          style={{ padding: '0.38rem 0.6rem', border: `1px solid ${currentPage === pg ? ORANGE : '#e2e8f0'}`, background: currentPage === pg ? ORANGE : '#fff', borderRadius: '7px', cursor: 'pointer', color: currentPage === pg ? '#fff' : '#475569', fontSize: '0.8rem', fontWeight: 600, minWidth: '32px', fontFamily: 'inherit' }}>
                          {pg}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        style={{ padding: '0.38rem 0.65rem', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '7px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ ANALYTICS ════ */}
          {activeTab === 'analytics' && (
            <div>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Analytics &amp; Metrics</h2>
              {analytics ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    {[
                      { label: 'Total Applications', value: analytics.totalApplications || applications.length, icon: ClipboardList, color: '#3b82f6', bg: '#eff6ff' },
                      { label: 'Total Disbursed',     value: `KES ${Number(analytics.totalAllocated || analytics.totalAllocatedBalance || 0).toLocaleString()}`, icon: DollarSign, color: '#10b981', bg: '#f0fdf4' },
                      { label: 'Total Revenue',       value: `KES ${Number(analytics.totalRevenue || analytics.totalFeesPaid || 0).toLocaleString()}`, icon: TrendingUp, color: ORANGE, bg: '#fff7ed' },
                      { label: 'Conversion Rate',     value: `${analytics.conversionRate || 0}%`, icon: Activity, color: '#8b5cf6', bg: '#f5f3ff' },
                    ].map((c, i) => {
                      const Icon = c.icon;
                      return (
                        <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ width: '44px', height: '44px', background: c.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                            <Icon size={22} color={c.color} />
                          </div>
                          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>{c.value}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bar chart breakdown */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Application Status Breakdown</h3>
                    {[
                      { label: 'Pending / In Progress', count: kpis.pending,  color: '#f59e0b', pct: kpis.total ? Math.round((kpis.pending  / kpis.total) * 100) : 0 },
                      { label: 'Approved / Disbursed',  count: kpis.approved, color: '#10b981', pct: kpis.total ? Math.round((kpis.approved / kpis.total) * 100) : 0 },
                      { label: 'Rejected / Cancelled',  count: kpis.rejected, color: '#ef4444', pct: kpis.total ? Math.round((kpis.rejected / kpis.total) * 100) : 0 },
                    ].map(row => (
                      <div key={row.label} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{row.label}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{row.count} ({row.pct}%)</span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '4rem', textAlign: 'center' }}>
                  <Activity size={36} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                  <p style={{ color: '#64748b', margin: 0 }}>Loading analytics data...</p>
                </div>
              )}
            </div>
          )}

          {/* ════ SUPPORT CONSOLE ════ */}
          {activeTab === 'support' && (
            <div>
              <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Support Console</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', minHeight: '520px' }}>
                {/* Ticket list */}
                <div style={{ borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
                  <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 0.1rem', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Chat Tickets</h3>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{openTickets} open</div>
                  </div>
                  <div style={{ padding: '0.4rem' }}>
                    {tickets.length > 0 ? tickets.map((t: any) => (
                      <button key={t.id} onClick={() => setSelectedTicket(t)}
                        style={{ width: '100%', padding: '0.85rem', textAlign: 'left', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.1s', borderLeft: `3px solid ${t.status === 'OPEN' ? ORANGE : '#e2e8f0'}`, background: selectedTicket?.id === t.id ? '#fff7ed' : 'transparent', fontFamily: 'inherit' }}
                        onMouseEnter={e => { if (selectedTicket?.id !== t.id) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (selectedTicket?.id !== t.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.15rem' }}>{t.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.15rem' }}>📞 {t.customerPhone}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                      </button>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                        <MessageCircle size={28} style={{ marginBottom: '0.5rem' }} />
                        <p style={{ margin: 0, fontSize: '0.82rem' }}>No tickets yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversation */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {selectedTicket ? (
                    <>
                      <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{selectedTicket.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedTicket.customerPhone} · {selectedTicket.subject}</div>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {(selectedTicket.messages || []).map((m: any) => {
                          const isAdminMsg = m.sender === 'ADMIN';
                          return (
                            <div key={m.id} style={{ display: 'flex', justifyContent: isAdminMsg ? 'flex-end' : 'flex-start' }}>
                              <div style={{ maxWidth: '70%', padding: '0.6rem 0.9rem', borderRadius: isAdminMsg ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isAdminMsg ? ORANGE : '#f1f5f9', color: isAdminMsg ? '#fff' : '#0f172a', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                {m.text}
                                <div style={{ fontSize: '0.63rem', opacity: 0.65, marginTop: '0.2rem', textAlign: 'right' }}>
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <form onSubmit={handleSendReply} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
                        <input type="text" placeholder="Type a reply..." value={supportReply} onChange={e => setSupportReply(e.target.value)}
                          style={{ flex: 1, padding: '0.65rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.65rem 1.1rem', background: ORANGE, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit' }}>
                          <Send size={14} /> Send
                        </button>
                      </form>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
                      <MessageCircle size={36} style={{ marginBottom: '0.75rem' }} />
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>Select a ticket to view the conversation</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ PLACEHOLDER TABS ════ */}
          {!['dashboard','applications','analytics','support'].includes(activeTab) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', color: '#64748b', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                {(() => {
                  const item = ALL_NAV_ITEMS.find(i => i.id === activeTab);
                  const Icon = item?.icon || Package;
                  return <Icon size={30} color="#94a3b8" />;
                })()}
              </div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#334155', fontWeight: 700, fontSize: '1.05rem' }}>Coming Soon</h3>
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem' }}>This section is under development.</p>
              <button onClick={() => handleTabChange('dashboard')}
                style={{ padding: '0.6rem 1.25rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit' }}>
                Back to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ══ MANAGE APPLICATION SLIDE PANEL ══════════════════════ */}
      {selectedApp && (
        <>
          <div onClick={() => setSelectedApp(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 98, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px', background: '#fff', borderLeft: '1px solid #e2e8f0', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', zIndex: 99, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <h3 style={{ margin: '0 0 0.1rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Manage Application</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{selectedApp.transactionRef}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem', display: 'flex', color: '#475569' }}>
                <X size={17} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1 }}>
              {/* Applicant summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '0.6rem' }}>{selectedApp.fullName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Phone</span><span style={{ fontWeight: 600, color: '#334155' }}>{selectedApp.phoneNumber}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>National ID</span><span style={{ fontWeight: 600, color: '#334155' }}>{selectedApp.nationalId}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Loan Amount</span><span style={{ fontWeight: 700, color: '#0f172a' }}>KES {Number(selectedApp.amount || 0).toLocaleString()}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Allocated</span><span style={{ fontWeight: 700, color: '#065f46' }}>KES {Number(selectedApp.allocatedBalance || 0).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Allocate balance */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Allocate Loan Balance</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>KES</span>
                    <input type="number" placeholder="Amount" value={allocateAmount} onChange={e => setAllocateAmount(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.7rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <button onClick={() => handleAllocate(selectedApp.id)} disabled={actionLoading}
                    style={{ padding: '0.65rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', opacity: actionLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {actionLoading ? '...' : 'Allocate'}
                  </button>
                </div>
              </div>

              {/* Update status */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔄 Update Workflow Status</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                    style={{ flex: 1, padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#fff', fontFamily: 'inherit' }}>
                    <option value="">Select Status</option>
                    <option value="Initial_Verification">Initial Verification</option>
                    <option value="Credit_Assessment">Credit Assessment</option>
                    <option value="Loan_Review">Loan Review</option>
                    <option value="Approved">Approved / Allocated</option>
                    <option value="Disbursed">Disbursed Funds</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button onClick={() => handleStatusChange(selectedApp.id)} disabled={actionLoading}
                    style={{ padding: '0.65rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', opacity: actionLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {actionLoading ? '...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
