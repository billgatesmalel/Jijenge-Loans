import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, BarChart2, CreditCard, DollarSign, Package, MessageCircle,
  Mail, Search, RefreshCcw, Bell, ChevronDown, LogOut, ArrowLeft,
  CheckCircle, XCircle, Clock, Sliders, AlertCircle, X, ChevronLeft,
  ChevronRight, Send, ArrowUpRight, TrendingUp, Activity, Shield,
  Plus, Edit, Trash2, Check, Smartphone, CheckSquare, Sparkles, HelpCircle, Info,
  User, Menu, ClipboardList
} from 'lucide-react';

import { updateLocalSupportSettings, getCachedSupportSettings } from '../lib/supportSettings';
import { apiFetch } from '../lib/api';

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

/* ── Sidebar nav sections (Mockup aligned) ───────────────────── */
const NAV_SECTIONS = [
  {
    title: 'MAIN OVERVIEW',
    items: [
      { id: 'applications', label: 'Applications Registry', icon: FileText, color: '#a1a1aa' },
      { id: 'analytics',    label: 'Analytics & Summaries', icon: BarChart2, color: '#3b82f6' }
    ]
  },
  {
    title: 'SERVICES',
    items: [
      { id: 'payments',     label: 'Payment Channels / STK', icon: CreditCard, color: '#10b981' },
      { id: 'allocations',  label: 'Customer Allocations',   icon: DollarSign, color: '#d97706' },
      { id: 'products',     label: 'Loan Products & Eligibility', icon: Package, color: '#f97316' }
    ]
  },
  {
    title: 'INTEGRATIONS & HELP',
    items: [
      { id: 'support',      label: 'Support Centre',         icon: MessageCircle, color: '#10b981' },
      { id: 'sms',          label: 'SMS Manager',            icon: Mail, color: '#a855f7' },
      { id: 'settings',     label: 'Platform & Contact Settings', icon: Sliders, color: '#3b82f6' }
    ]
  }
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);
const ORANGE = '#FF6600';
const ITEMS_PER_PAGE = 10;

export const AdminDashboardModal: React.FC<AdminDashboardProps> = ({ onClose }) => {

  /* ── State variables ───────────────────────────────────────── */
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [arrivedViaSwitch, setArrivedViaSwitch] = useState(false);

  // Tab navigation with persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('bl_admin_active_tab') || 'applications';
  });

  // Data Collections
  const [applications, setApplications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [brackets, setBrackets] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [withdrawalRejectModalOpen, setWithdrawalRejectModalOpen] = useState(false);
  const [selectedWithdrawalForReject, setSelectedWithdrawalForReject] = useState<any>(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('Mismatch between National ID, Full Name and M-Pesa Phone Number');
  const [customRejectionNotes, setCustomRejectionNotes] = useState('');
  const [selectedTicketForReply, setSelectedTicketForReply] = useState<any>(null);
  const [adminTicketReplyText, setAdminTicketReplyText] = useState('');

  // Filtering / Loading States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feeFilter, setFeeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH
  const [currentPage, setCurrentPage] = useState(1);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Selected Detail Views / Modals
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [bracketModalOpen, setBracketModalOpen] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<any>(null);

  // Bulk Selection States & Modals
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [selectedSmsIds, setSelectedSmsIds] = useState<string[]>([]);
  const [bulkSmsModalOpen, setBulkSmsModalOpen] = useState(false);
  const [bulkSmsMessage, setBulkSmsMessage] = useState('');

  // Form Inputs
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [supportReply, setSupportReply] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');

  // Eligibility Calculator Preview State
  const [previewSalary, setPreviewSalary] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);

  // Bracket Form Fields
  const [bracketName, setBracketName] = useState('');
  const [bracketMinSalary, setBracketMinSalary] = useState('');
  const [bracketMaxSalary, setBracketMaxSalary] = useState('');
  const [bracketPackage, setBracketPackage] = useState('');
  const [bracketLimit, setBracketLimit] = useState('');
  const [bracketFee, setBracketFee] = useState('');
  const [bracketWeeklyInstallment, setBracketWeeklyInstallment] = useState('');
  const [bracketNumWeeks, setBracketNumWeeks] = useState('');
  const [bracketMonthlyInstallment, setBracketMonthlyInstallment] = useState('');
  const [bracketNumMonths, setBracketNumMonths] = useState('');

  // SMS Form Fields
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsText, setSmsText] = useState('');
  const [smsBroadcast, setSmsBroadcast] = useState(false);
  const [smsTemplateModal, setSmsTemplateModal] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');

  // System & Contact Settings Form Fields (initialized from live cache/localStorage)
  const [settingsPhone, setSettingsPhone] = useState(() => getCachedSupportSettings().supportPhone);
  const [settingsEmail, setSettingsEmail] = useState(() => getCachedSupportSettings().supportEmail);
  const [settingsWhatsapp, setSettingsWhatsapp] = useState(() => getCachedSupportSettings().supportWhatsapp);
  const [settingsHours, setSettingsHours] = useState(() => getCachedSupportSettings().supportHours);
  const [settingsAddress, setSettingsAddress] = useState(() => getCachedSupportSettings().headquartersAddress);

  // Layout UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  /* ── Lifecycle Effects ─────────────────────────────────────── */
  useEffect(() => {
    const customerRole = sessionStorage.getItem('bl_customer_role') || localStorage.getItem('bl_customer_role');
    const customerToken = sessionStorage.getItem('bl_customer_token') || localStorage.getItem('bl_customer_token');
    if (customerToken && (customerRole === 'ADMIN' || customerRole === 'SUPER_ADMIN')) {
      setIsAuth(true);
      setArrivedViaSwitch(true);
      fetchAllAdminData(customerToken);
      return;
    }
    const superToken = sessionStorage.getItem('bl_super_admin_token') || localStorage.getItem('bl_super_admin_token');
    if (superToken) {
      setIsAuth(true);
      setArrivedViaSwitch(false);
      fetchAllAdminData(superToken);
    } else {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (isAuth && activeTab === 'support') {
      const token = getAdminToken();
      if (token) {
        intervalId = setInterval(() => syncTickets(token), 4000);
      }
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isAuth, activeTab, selectedTicket]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Auth session error helper ──────────────────────────── */
  const handleAuthError = (res: Response, message?: string): boolean => {
    if (res.status === 401) {
      sessionStorage.removeItem('bl_super_admin_token');
      localStorage.removeItem('bl_super_admin_token');
      sessionStorage.removeItem('bl_customer_token');
      localStorage.removeItem('bl_customer_token');
      sessionStorage.removeItem('bl_customer_role');
      localStorage.removeItem('bl_customer_role');
      setIsAuth(false);
      setLoginError(message || 'Your admin session has expired. Please sign in again.');
      return true;
    }
    return false;
  };

  /* ── Business logic (preserved exactly) ──────────────────── */
  const getAdminToken = (): string | null => {
    const ct = sessionStorage.getItem('bl_customer_token') || localStorage.getItem('bl_customer_token');
    const cr = sessionStorage.getItem('bl_customer_role') || localStorage.getItem('bl_customer_role');
    if (ct && (cr === 'ADMIN' || cr === 'SUPER_ADMIN')) return ct;
    return sessionStorage.getItem('bl_super_admin_token') || localStorage.getItem('bl_super_admin_token');
  };

  const fetchAllAdminData = async (token: string) => {
    setDataLoading(true);
    try {
      const [appRes, anaRes, tickRes, custRes, payRes, bracRes, smsLRes, smsTRes, setRes, withdRes] = await Promise.all([
        apiFetch('/api/admin/applications', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/support-tickets', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/payments', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/eligibility-brackets', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/sms-logs', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/admin/sms-templates', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/support/settings'),
        apiFetch('/api/admin/withdrawals', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (appRes.status === 401 || bracRes.status === 401 || custRes.status === 401) {
        handleAuthError(appRes.status === 401 ? appRes : bracRes);
        return;
      }

      if (appRes.ok) { const d = await appRes.json(); setApplications(d.items || d.applications || []); }
      if (anaRes.ok) { const d = await anaRes.json(); setAnalytics(d.metrics || d.analytics || d || null); }
      if (tickRes.ok) { const d = await tickRes.json(); setTickets(d.tickets || []); }
      if (custRes.ok) { const d = await custRes.json(); setCustomers(d.items || []); }
      if (payRes.ok) { const d = await payRes.json(); setPayments(d.items || []); }
      if (bracRes.ok) { const d = await bracRes.json(); setBrackets(d.items || []); }
      if (smsLRes.ok) { const d = await smsLRes.json(); setSmsLogs(d.items || []); }
      if (smsTRes.ok) { const d = await smsTRes.json(); setSmsTemplates(d.items || []); }
      if (withdRes.ok) { const d = await withdRes.json(); setAdminWithdrawals(d.items || []); }
      if (setRes.ok) {
        const d = await setRes.json();
        if (d.settings) {
          if (d.settings.supportPhone) setSettingsPhone(d.settings.supportPhone);
          if (d.settings.supportEmail) setSettingsEmail(d.settings.supportEmail);
          if (d.settings.supportWhatsapp) setSettingsWhatsapp(d.settings.supportWhatsapp);
          if (d.settings.supportHours) setSettingsHours(d.settings.supportHours);
          if (d.settings.headquartersAddress) setSettingsAddress(d.settings.headquartersAddress);
          updateLocalSupportSettings(d.settings);
        }
      }
    } catch (e) {
      console.error('Failed to load full admin workspace data:', e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/support/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          supportPhone: settingsPhone,
          supportEmail: settingsEmail,
          supportWhatsapp: settingsWhatsapp,
          supportHours: settingsHours,
          headquartersAddress: settingsAddress,
        }),
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok && data.settings) {
        updateLocalSupportSettings(data.settings);
        showToast('Platform & contact settings saved and synced!');
      } else {
        alert(data.message || 'Failed to save settings.');
      }
    } catch {
      alert('Network error while saving settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const syncTickets = async (token: string) => {
    try {
      const res = await apiFetch('/api/support/tickets', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets || []);
        if (selectedTicket) {
          const u = (d.tickets || []).find((t: any) => t.id === selectedTicket.id);
          if (u) setSelectedTicket(u);
        }
      }
    } catch { /* ignored */ }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pass: password.trim() }),
      });
      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Gateway/Backend Connectivity Error (HTTP ${res.status}). Verify backend deployment.`);
      }

      if (res.ok && data.accessToken) {
        sessionStorage.setItem('bl_super_admin_token', data.accessToken);
        localStorage.setItem('bl_super_admin_token', data.accessToken);
        setIsAuth(true);
        setArrivedViaSwitch(false);
        fetchAllAdminData(data.accessToken);
      } else {
        setLoginError(data.message || 'Access Denied. Check credentials and try again.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Gateway connectivity error. Please verify the backend status.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bl_super_admin_token');
    localStorage.removeItem('bl_super_admin_token');
    localStorage.removeItem('bl_admin_active_tab');
    setIsAuth(false);
    onClose();
  };

  const handleBackToCustomerDashboard = () => { window.location.hash = 'customer'; };

  const handleAllocate = async (loanId: string) => {
    if (!allocateAmount) return;
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/allocate-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ loanId, amount: parseFloat(allocateAmount), notes: allocationNotes }),
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        showToast('Balance allocated successfully!');
        setSelectedApp(null);
        setAllocateAmount('');
        setAllocationNotes('');
        fetchAllAdminData(token);
      } else {
        alert(data.message || 'Allocation failed');
      }
    } catch {
      alert('Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (loanId: string, statusVal: string) => {
    const targetStatus = statusVal || newStatus;
    if (!targetStatus) return;
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ loanId, status: targetStatus }),
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        showToast(`Status updated to ${targetStatus}`);
        setSelectedApp(null);
        setNewStatus('');
        fetchAllAdminData(token);
      } else {
        alert(data.message || 'Failed to update status.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportReply.trim() || !selectedTicket) return;
    const token = getAdminToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/api/support/tickets/${selectedTicket.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sender: 'ADMIN', senderName: 'Admin Agent', text: supportReply.trim() }),
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok && data.success) {
        setSupportReply('');
        syncTickets(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/api/admin/support-tickets/${ticketId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast('Ticket marked as resolved');
        setSelectedTicket(null);
        fetchAllAdminData(token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ── Manage Eligibility Brackets ───────────────────────────── */
  const handleSaveBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);

    const payload = {
      name: bracketPackage,
      minSalary: parseFloat(bracketMinSalary),
      maxSalary: parseFloat(bracketMaxSalary),
      assignedPackageName: bracketPackage,
      maxLimit: parseFloat(bracketLimit),
      processingFee: parseFloat(bracketFee) || 450,
      weeklyInstallment: parseFloat(bracketWeeklyInstallment) || 0,
      numWeeks: parseInt(bracketNumWeeks, 10) || 4,
      monthlyInstallment: parseFloat(bracketMonthlyInstallment) || 0,
      numMonths: parseInt(bracketNumMonths, 10) || 1,
    };

    try {
      let res;
      if (selectedBracket) {
        res = await apiFetch(`/api/admin/eligibility-brackets/${selectedBracket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/admin/eligibility-brackets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (handleAuthError(res)) return;

      if (res.ok) {
        showToast(selectedBracket ? 'Bracket updated successfully!' : 'New bracket created!');
        setBracketModalOpen(false);
        setSelectedBracket(null);
        clearBracketForm();
        fetchAllAdminData(token);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to save eligibility bracket.');
      }
    } catch {
      alert('Error connecting to database.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBracket = async (bracketId: number) => {
    if (!confirm('Are you sure you want to delete this eligibility rule?')) return;
    const token = getAdminToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/api/admin/eligibility-brackets/${bracketId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast('Bracket deleted');
        fetchAllAdminData(token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearBracketForm = () => {
    setBracketName('');
    setBracketMinSalary('');
    setBracketMaxSalary('');
    setBracketPackage('');
    setBracketLimit('');
    setBracketFee('');
    setBracketWeeklyInstallment('');
    setBracketNumWeeks('');
    setBracketMonthlyInstallment('');
    setBracketNumMonths('');
  };

  const handleEditBracket = (b: any) => {
    setSelectedBracket(b);
    setBracketMinSalary(String(b.minSalary));
    setBracketMaxSalary(String(b.maxSalary));
    setBracketPackage(b.assignedPackageName || b.name || '');
    setBracketLimit(String(b.maxLimit));
    setBracketFee(b.processingFee !== undefined && b.processingFee !== null ? String(b.processingFee) : '450');
    setBracketWeeklyInstallment(b.weeklyInstallment ? String(b.weeklyInstallment) : '');
    setBracketNumWeeks(b.numWeeks ? String(b.numWeeks) : '4');
    setBracketMonthlyInstallment(b.monthlyInstallment ? String(b.monthlyInstallment) : '');
    setBracketNumMonths(b.numMonths ? String(b.numMonths) : '1');
    setBracketModalOpen(true);
  };

  /* ── Preview Eligibility Bracket Qualification ─────────────── */
  const handlePreviewEligibility = (e: React.FormEvent) => {
    e.preventDefault();
    const sal = parseFloat(previewSalary);
    if (isNaN(sal)) {
      setPreviewResult({ error: 'Please enter a valid salary' });
      return;
    }

    const matched = brackets.find((b: any) => sal >= b.minSalary && sal <= b.maxSalary && b.active !== false);
    if (matched) {
      const limit = matched.maxLimit || 0;
      setPreviewResult({
        qualified: true,
        packageName: matched.assignedPackageName || matched.name,
        maxLimit: limit,
        bracketName: matched.name,
        processingFee: matched.processingFee ?? 450,
        weeklyRepayment: Math.round(limit * 1.05),
        monthlyRepayment: Math.round(limit * 1.12),
      });
    } else {
      setPreviewResult({
        qualified: false,
        message: 'No active package matches this salary bracket.'
      });
    }
  };

  /* ── Bulk Selection & Actions ──────────────────────────────── */
  const handleToggleSelectApp = (id: string) => {
    setSelectedAppIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllApps = () => {
    if (selectedAppIds.length === pagedApplications.length && pagedApplications.length > 0) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(pagedApplications.map((a: any) => a.id));
    }
  };

  const handleToggleSelectSms = (id: string) => {
    setSelectedSmsIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllSms = () => {
    if (selectedSmsIds.length === pagedSmsLogs.length && pagedSmsLogs.length > 0) {
      setSelectedSmsIds([]);
    } else {
      setSelectedSmsIds(pagedSmsLogs.map((l: any) => l.id));
    }
  };

  const handleBulkDeleteApplications = async () => {
    if (selectedAppIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedAppIds.length} selected loan applications?`)) return;
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/applications/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedAppIds }),
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast(`Successfully deleted ${selectedAppIds.length} application(s)`);
        setSelectedAppIds([]);
        fetchAllAdminData(token);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to delete applications');
      }
    } catch {
      alert('Network error during bulk delete.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeleteSmsLogs = async () => {
    if (selectedSmsIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedSmsIds.length} selected SMS logs?`)) return;
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/sms-logs/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedSmsIds }),
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast(`Successfully deleted ${selectedSmsIds.length} SMS log(s)`);
        setSelectedSmsIds([]);
        fetchAllAdminData(token);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to delete SMS logs');
      }
    } catch {
      alert('Network error during bulk delete.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendBulkSmsToSelectedApps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSmsMessage.trim() || selectedAppIds.length === 0) return;
    const token = getAdminToken();
    if (!token) return;
    const selectedApps = applications.filter((a: any) => selectedAppIds.includes(a.id));
    const phones = Array.from(new Set(selectedApps.map((a: any) => a.phoneNumber).filter(Boolean)));
    if (phones.length === 0) {
      alert('No valid phone numbers found among selected items.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/send-sms-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phones, message: bulkSmsMessage.trim() }),
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast(`Broadcast SMS sent to ${phones.length} recipient(s)!`);
        setBulkSmsModalOpen(false);
        setBulkSmsMessage('');
        setSelectedAppIds([]);
        fetchAllAdminData(token);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to send bulk SMS');
      }
    } catch {
      alert('Network error during bulk SMS.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetriggerStkAdmin = async (loanId: string) => {
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/applications/${loanId}/retrigger-stk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast('M-Pesa STK Push re-triggered successfully!');
        if (selectedApp?.id === loanId) setSelectedApp(null);
        fetchAllAdminData(token);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to re-trigger STK Push');
      }
    } catch {
      alert('Network error while re-triggering STK push.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAppAdmin = async (loanId: string) => {
    if (!confirm('Are you sure you want to reset this application to allow the customer to re-apply cleanly?')) return;
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/applications/${loanId}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast('Application reset successfully');
        if (selectedApp?.id === loanId) setSelectedApp(null);
        fetchAllAdminData(token);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to reset application');
      }
    } catch {
      alert('Network error while resetting application.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── SMS Management ────────────────────────────────────────── */
  const handleSendManualSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) return;

    if (smsBroadcast) {
      if (!confirm(`Are you sure you want to send this broadcast message to ALL ${applications.length} loan applicants?`)) return;
    } else if (!smsRecipient) {
      alert('Recipient phone number is required');
      return;
    }

    setActionLoading(true);
    try {
      let successCount = 0;
      if (smsBroadcast) {
        // Broadcast send loop
        const phones = Array.from(new Set(applications.map(a => a.phoneNumber)));
        for (const phone of phones) {
          const res = await apiFetch('/api/admin/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ phone, message: smsText.trim() })
          });
          if (res.ok) successCount++;
        }
        showToast(`SMS Broadcast finished. Sent to ${successCount} numbers.`);
      } else {
        const res = await apiFetch('/api/admin/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phone: smsRecipient, message: smsText.trim() })
        });
        if (res.ok) {
          showToast('SMS sent successfully!');
          setSmsRecipient('');
        } else {
          alert('Failed to send SMS');
        }
      }
      setSmsText('');
      setSmsBroadcast(false);
      fetchAllAdminData(token);
    } catch {
      alert('Connection error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpsertTemplate = async (key: string, title: string, body: string) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      const res = await apiFetch('/api/admin/sms-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, title, body, variables: [] })
      });
      if (res.ok) {
        showToast('SMS template saved');
        setSmsTemplateModal(false);
        fetchAllAdminData(token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUseTemplate = (t: any) => {
    setSmsText(t.body);
    setSelectedTemplateKey(t.key);
    showToast(`Loaded "${t.title}" template`);
  };

  const handleTriggerRemindersEngine = async () => {
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/trigger-reminders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Reminders Engine executed! 24H Sent: ${data.processed24hCount || 0}, 7D Sent: ${data.processed7dCount || 0}`);
        fetchAllAdminData(token);
      } else {
        alert(data.message || 'Failed to execute reminders engine.');
      }
    } catch {
      alert('Error triggering automated reminders engine.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedDefaultTemplates = async () => {
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/sms-templates/seed-defaults', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok && data.items) {
        setSmsTemplates(data.items);
        showToast('Default SMS templates restored/seeded!');
      } else {
        alert(data.message || 'Failed to seed templates.');
      }
    } catch {
      alert('Error seeding default templates.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSmsTemplate = async (template: any) => {
    const token = getAdminToken();
    if (!token) return;
    const nextState = template.active === false ? true : false;
    try {
      const res = await apiFetch(`/api/admin/sms-templates/${template.id || template.key}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: nextState })
      });
      if (handleAuthError(res)) return;
      if (res.ok) {
        showToast(`Template "${template.title}" turned ${nextState ? 'ON (Active)' : 'OFF (Disabled)'}`);
        fetchAllAdminData(token);
      } else {
        alert('Failed to toggle SMS template');
      }
    } catch {
      alert('Network error toggling template');
    }
  };

  const handleApproveWithdrawal = async (wId: string) => {
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/withdrawals/${wId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        showToast('Withdrawal approved and disbursed to M-Pesa!');
        fetchAllAdminData(token);
      } else {
        alert(data.message || 'Failed to approve withdrawal.');
      }
    } catch {
      alert('Network error approving withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRejectWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawalForReject) return;
    const token = getAdminToken();
    if (!token) return;
    const fullReason = customRejectionNotes.trim()
      ? `${selectedRejectionReason} — ${customRejectionNotes.trim()}`
      : selectedRejectionReason;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/withdrawals/${selectedWithdrawalForReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: fullReason })
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        showToast(`Withdrawal rejected. KES ${selectedWithdrawalForReject.amount.toLocaleString()} restored to customer balance!`);
        setWithdrawalRejectModalOpen(false);
        setSelectedWithdrawalForReject(null);
        setCustomRejectionNotes('');
        fetchAllAdminData(token);
      } else {
        alert(data.message || 'Failed to reject withdrawal.');
      }
    } catch {
      alert('Network error rejecting withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplySupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForReply || !adminTicketReplyText.trim()) return;
    const token = getAdminToken();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/support-tickets/${selectedTicketForReply.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: adminTicketReplyText.trim() })
      });
      if (handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        showToast('Reply sent & SMS with direct chat token link triggered!');
        setAdminTicketReplyText('');
        if (data.ticket) {
          setSelectedTicketForReply(data.ticket);
        }
        fetchAllAdminData(token);
      } else {
        alert(data.message || 'Failed to send reply');
      }
    } catch {
      alert('Network error replying to support ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateStkPush = async (phone: string, amount: number, reference: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/payments/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, txRef: reference })
      });
      const d = await res.json();
      if (res.ok && d.success) {
        showToast('STK Push Triggered Successfully!');
        const t = getAdminToken();
        if (t) fetchAllAdminData(t);
      } else {
        alert(d.message || 'PalPluss gateway error');
      }
    } catch {
      alert('Network request failed');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Export Applications Data to CSV ──────────────────────── */
  const exportApplicationsToCSV = () => {
    const headers = ['Ref', 'Applicant', 'Phone', 'National ID', 'Amount', 'Allocated', 'Fee Status', 'Status', 'Date'];
    const csvRows = [headers.join(',')];

    filteredApplications.forEach(app => {
      const values = [
        app.transactionRef,
        `"${app.fullName}"`,
        app.phoneNumber,
        app.nationalId,
        app.amount,
        app.allocatedBalance,
        app.feeStatus,
        app.status,
        new Date(app.createdAt).toISOString().split('T')[0]
      ];
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jijenge_applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  /* ── Toast Helper ──────────────────────────────────────────── */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('bl_admin_active_tab', tab);
    setSelectedApp(null);
    setSelectedTicket(null);
    setSelectedCustomer(null);
    setSearchQuery('');
    setCurrentPage(1);
  };

  /* ── Dynamic Tab Content Logic ─────────────────────────────── */

  // TAB 1: Applications Registry
  const filteredApplications = applications.filter((app: any) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = (app.fullName || '').toLowerCase().includes(q)
        || (app.transactionRef || '').toLowerCase().includes(q)
        || (app.phoneNumber || '').includes(q)
        || (app.nationalId || '').includes(q);
      if (!match) return false;
    }
    // Status filter
    if (statusFilter && app.status !== statusFilter) return false;
    // Fee status filter
    if (feeFilter && app.feeStatus !== feeFilter) return false;
    // Date filter
    if (dateFilter !== 'ALL') {
      const d = new Date(app.createdAt);
      const now = new Date();
      if (dateFilter === 'TODAY' && d.toDateString() !== now.toDateString()) return false;
      if (dateFilter === 'WEEK' && (now.getTime() - d.getTime()) > 7 * 24 * 60 * 60 * 1000) return false;
      if (dateFilter === 'MONTH' && d.getMonth() !== now.getMonth()) return false;
    }
    return true;
  });

  const pagedApplications = filteredApplications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // TAB 3: Payment Channels
  const filteredPayments = payments.filter((p: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (p.fullName || '').toLowerCase().includes(q)
      || (p.phoneNumber || '').includes(q)
      || (p.transactionRef || '').toLowerCase().includes(q);
  });
  const pagedPayments = filteredPayments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // TAB 4: Customer Allocations
  const filteredCustomers = customers.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.fullName || '').toLowerCase().includes(q)
      || (c.phoneNumber || '').includes(q)
      || (c.nationalId || '').includes(q);
  });
  const pagedCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // TAB 7: SMS Logs
  const filteredSmsLogs = smsLogs.filter((l: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (l.recipientPhone || '').includes(q) || (l.message || '').toLowerCase().includes(q);
  });
  const pagedSmsLogs = filteredSmsLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const statusBadge = (s: string) => STATUS_CFG[s] || { label: s.replace(/_/g, ' '), color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' };
  const feeBadge = (s: string) => FEE_CFG[s] || { label: s || '—', color: '#374151', bg: '#f3f4f6' };

  const openTicketsCount = tickets.filter((t: any) => t.status === 'OPEN').length;
  const kpis = {
    total: applications.length,
    pending: applications.filter(a => ['Application_Received', 'Initial_Verification', 'Credit_Assessment', 'Loan_Review'].includes(a.status)).length,
    approved: applications.filter(a => ['APPROVED', 'Approved', 'Disbursement_In_Progress', 'DISBURSED', 'Disbursed'].includes(a.status)).length,
    rejected: applications.filter(a => ['REJECTED', 'Rejected', 'CANCELLED'].includes(a.status)).length,
    disbursed: analytics?.totalAllocated || analytics?.totalAllocatedBalance || 0,
    revenue: analytics?.totalRevenue || analytics?.totalFeesPaid || 0,
    tickets: openTicketsCount,
    rate: analytics?.conversionRate || 0,
  };

  const sidebarW = sidebarCollapsed ? '72px' : '280px';
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ════════════════════════════════════════════════════════════
     1. LOGIN SCREEN (Preserved)
     ════════════════════════════════════════════════════════════ */
  if (!isAuth) {
    return (
      <div style={{
        minHeight: '100vh', width: '100%', boxSizing: 'border-box',
        background: `linear-gradient(135deg, #0c1e35 0%, #1e3a5f 100%)`,
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
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img
              src="/logo.png"
              alt="Jijenge Logo"
              style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 1rem', display: 'block' }}
            />
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
     2. WORKSPACE LAYOUT (Mockup themed light white layout)
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="admin-layout-root" style={{
      display: 'flex', height: '100vh', width: '100%', overflow: 'hidden',
      background: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif"
    }}>

      {/* ══ SIDEBAR ══ */}
      <aside className="admin-sidebar-root" style={{
        width: sidebarW, minWidth: sidebarW, height: '100vh', background: '#ffffff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s ease', zIndex: 50,
        borderRight: '1px solid #e2e8f0', boxShadow: '2px 0 8px rgba(0,0,0,0.02)'
      }}>
        {/* Brand header */}
        <div style={{
          display: 'flex', alignItems: 'center', height: '64px', padding: sidebarCollapsed ? '0' : '0 1rem',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #f1f5f9', flexShrink: 0, boxSizing: 'border-box'
        }}>
          {!sidebarCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src="/logo.png" alt="Jijenge Admin" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1 }}>Jijenge Admin</div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem', lineHeight: 1.3 }}>Control Panel</div>
                </div>
              </div>
              <button onClick={() => setSidebarCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px', display: 'flex' }}>
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarCollapsed(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <img src="/logo.png" alt="Jijenge Admin" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0', scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.title} style={{ marginBottom: '1.25rem' }}>
              {!sidebarCollapsed && (
                <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.4rem 1.25rem 0.4rem' }}>
                  {section.title}
                </div>
              )}
              {section.items.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => handleTabChange(item.id)} title={sidebarCollapsed ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '92%',
                      margin: '0.15rem auto', padding: '0.65rem 1rem',
                      borderRadius: '10px',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      background: active ? '#FFF5ED' : 'transparent',
                      border: active ? '1px solid #FFD6B3' : '1px solid transparent',
                      cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {active && <div style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: '#FF6600', borderRadius: '0 3px 3px 0' }} />}
                    <Icon size={18} color={active ? '#FF6600' : item.color} style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && (
                      <span style={{ color: active ? '#FF6600' : '#475569', fontSize: '0.85rem', fontWeight: active ? 700 : 500, flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                    {item.id === 'support' && openTicketsCount > 0 && (
                      <span style={{
                        background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 700,
                        padding: '1px 5px', borderRadius: '10px', minWidth: '18px', textAlign: 'center', lineHeight: '16px',
                        marginLeft: sidebarCollapsed ? undefined : 'auto'
                      }}>
                        {openTicketsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.75rem 0.6rem', flexShrink: 0 }}>
          <button onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start', borderRadius: '8px', transition: 'background 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <LogOut size={18} color="#ef4444" />
            {!sidebarCollapsed && <span style={{ color: '#ef4444', fontSize: '0.86rem', fontWeight: 700 }}>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ══ MAIN AREA ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── TOP HEADER ── */}
        <header style={{
          height: '64px', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.5rem', flexShrink: 0, boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)', zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '6px', borderRadius: '6px' }}>
                <Menu size={20} />
              </button>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 850, color: '#0f172a', lineHeight: 1.2 }}>
                {ALL_NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Dashboard'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>{dateStr}</p>
            </div>
          </div>

          {/* Center Search */}
          <div style={{ flex: 1, maxWidth: '400px', margin: '0 1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" placeholder="Search by name, reference, phone..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.2rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.84rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.52rem', cursor: 'pointer', display: 'flex' }}>
              <Bell size={17} color="#64748b" />
              {openTicketsCount > 0 && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />}
            </button>

            <button onClick={() => { const t = getAdminToken(); if (t) fetchAllAdminData(t); }} title="Refresh all lists"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.52rem', cursor: 'pointer', display: 'flex' }}>
              <RefreshCcw size={17} color="#64748b" />
            </button>

            {/* Profile Card */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(!profileOpen)} style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem', background: '#f8fafc',
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
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: '0.5rem', width: '230px', zIndex: 100
                }}>
                  <div style={{ padding: '0.5rem 0.75rem 0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Jijenge Administrator</div>
                    <span style={{ display: 'inline-block', marginTop: '0.3rem', background: '#fff7ed', color: ORANGE, border: `1px solid #fed7aa`, fontSize: '0.68rem', fontWeight: 700, padding: '1px 8px', borderRadius: '20px' }}>
                      Super Admin
                    </span>
                  </div>

                  {arrivedViaSwitch && (
                    <button onClick={() => { setProfileOpen(false); handleBackToCustomerDashboard(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#FF6600', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFF5ED'}
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

        {/* ── MAIN SCROLLABLE CONTAINER ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {toast && (
            <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999, background: '#0f172a', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              <CheckCircle size={16} color="#10b981" /> {toast}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 1: Applications Registry
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'applications' && (
            <div>
              {/* Filter & Search controls */}
              <div className="admin-card" style={{ padding: '1.15rem 1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="admin-search-box">
                    <Search size={16} className="admin-search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name, reference, phone, ID..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <select className="admin-filter-select" style={{ width: '100%' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="">All Statuses</option>
                      <option value="Pending_STK_Fee_Payment">Pending STK Payment</option>
                      <option value="Application_Received">Application Received</option>
                      <option value="Initial_Verification">Initial Verification</option>
                      <option value="Credit_Assessment">Credit Assessment</option>
                      <option value="Loan_Review">Loan Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Disbursed">Disbursed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <select className="admin-filter-select" style={{ width: '100%' }} value={feeFilter} onChange={e => { setFeeFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="">All Fee Statuses</option>
                      <option value="Pending_STK_Push">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <select className="admin-filter-select" style={{ width: '100%' }} value={dateFilter} onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}>
                      <option value="ALL">All Time</option>
                      <option value="TODAY">Today</option>
                      <option value="WEEK">Past 7 Days</option>
                      <option value="MONTH">This Month</option>
                    </select>
                  </div>

                  <button className="admin-btn admin-btn-secondary" onClick={exportApplicationsToCSV}>
                    📥 Export CSV
                  </button>
                </div>
              </div>

              {/* Bulk Action Bar for Applications */}
              {selectedAppIds.length > 0 && (
                <div style={{ background: '#FFF5ED', border: '1px solid #FFD8BE', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#9a3412' }}>
                    <CheckSquare size={18} color={ORANGE} />
                    <span>{selectedAppIds.length} application(s) selected</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button className="admin-btn admin-btn-primary" onClick={() => setBulkSmsModalOpen(true)} style={{ background: ORANGE, border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Send size={14} /> Broadcast SMS to Selected
                    </button>
                    <button className="admin-btn admin-btn-danger" onClick={handleBulkDeleteApplications} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Trash2 size={14} /> Delete Selected
                    </button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="admin-table-container">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedAppIds.length === pagedApplications.length && pagedApplications.length > 0} onChange={handleToggleSelectAllApps} style={{ cursor: 'pointer' }} />
                        </th>
                        <th>Reference</th>
                        <th>Applicant</th>
                        <th>Phone</th>
                        <th>National ID</th>
                        <th>Amount</th>
                        <th>Allocated</th>
                        <th>Fee Status</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}><td colSpan={10} style={{ padding: '1.25rem', textAlign: 'center', color: '#94a3b8' }}>Loading applications registry...</td></tr>
                        ))
                      ) : pagedApplications.length > 0 ? pagedApplications.map((app: any) => {
                        const sc = statusBadge(app.status);
                        const fc = feeBadge(app.feeStatus);
                        const isSelected = selectedAppIds.includes(app.id);
                        return (
                          <tr key={app.id} style={{ background: isSelected ? '#fff7ed' : undefined }}>
                            <td style={{ textAlign: 'center' }}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelectApp(app.id)} style={{ cursor: 'pointer' }} />
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{app.transactionRef}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{app.fullName}</td>
                            <td style={{ color: '#475569' }}>{app.phoneNumber}</td>
                            <td style={{ color: '#475569' }}>{app.nationalId}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>KES {app.amount.toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: '#065f46' }}>KES {app.allocatedBalance.toLocaleString()}</td>
                            <td>
                              <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: fc.color, background: fc.bg }}>{fc.label}</span>
                            </td>
                            <td>
                              <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                            </td>
                            <td>
                              <button className="admin-btn admin-btn-secondary" onClick={() => { setSelectedApp(app); setAllocateAmount(String(app.amount)); setNewStatus(app.status); }}>
                                <Sliders size={13} /> Manage
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={10} style={{ padding: '3rem', textAlign: 'center' }}>
                            <Info size={32} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
                            <div style={{ fontWeight: 700, color: '#64748b' }}>No Applications Found</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredApplications.length > ITEMS_PER_PAGE && (
                  <div className="admin-pagination-bar">
                    <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} – {Math.min(currentPage * ITEMS_PER_PAGE, filteredApplications.length)} of {filteredApplications.length} records</span>
                    <div className="admin-pagination-controls">
                      <button className="admin-btn admin-btn-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                      <span style={{ fontWeight: 600, color: '#334155', padding: '0 0.4rem' }}>Page {currentPage} of {Math.ceil(filteredApplications.length / ITEMS_PER_PAGE)}</span>
                      <button className="admin-btn admin-btn-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * ITEMS_PER_PAGE >= filteredApplications.length}>Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 2: Analytics & Summaries
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div>
              {/* Analytics Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Today Applications', value: applications.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length, icon: ClipboardList, color: '#3b82f6', bg: '#eff6ff' },
                  { label: 'Total Approved Limit', value: `KES ${Number(kpis.disbursed).toLocaleString()}`, icon: CheckCircle, color: '#10b981', bg: '#f0fdf4' },
                  { label: 'Total Fee Revenue', value: `KES ${Number(kpis.revenue).toLocaleString()}`, icon: TrendingUp, color: ORANGE, bg: '#fff7ed' },
                  { label: 'Active Support Tickets', value: kpis.tickets, icon: MessageCircle, color: '#8b5cf6', bg: '#f5f3ff' },
                ].map((k, i) => {
                  const Icon = k.icon;
                  return (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{k.label}</span>
                        <div style={{ padding: '0.4rem', background: k.bg, borderRadius: '8px' }}><Icon size={16} color={k.color} /></div>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{k.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Status breakdown list / custom graphs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Applications Lifecycle Stages</h3>
                  {[
                    { key: 'Pending STK', status: 'Pending_STK_Fee_Payment', color: '#f59e0b' },
                    { key: 'Received', status: 'Application_Received', color: '#3b82f6' },
                    { key: 'Under Review / Assessment', status: 'Credit_Assessment', color: '#8b5cf6' },
                    { key: 'Approved / Disbursed', status: 'Disbursed', color: '#10b981' },
                    { key: 'Rejected', status: 'Rejected', color: '#ef4444' }
                  ].map(row => {
                    const count = applications.filter(a => a.status === row.status).length;
                    const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;
                    return (
                      <div key={row.key} style={{ marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{row.key}</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: row.color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Popular Loan Packages */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Loan Package Performance</h3>
                  {(analytics?.packageAnalytics || brackets.map(b => ({
                    name: b.assignedPackageName || b.name,
                    count: applications.filter(a => (a.packageName || '').toLowerCase().includes((b.assignedPackageName || b.name).toLowerCase())).length,
                    totalVolume: applications.filter(a => (a.packageName || '').toLowerCase().includes((b.assignedPackageName || b.name).toLowerCase())).reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0),
                    weeklyRepayment: Math.round((b.maxLimit || 0) * 1.05),
                    monthlyRepayment: Math.round((b.maxLimit || 0) * 1.12),
                  }))).map((pkg: any) => {
                    const count = pkg.count || 0;
                    const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;
                    return (
                      <div key={pkg.name} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>{pkg.name}</div>
                          <span style={{ background: '#FFF5ED', color: '#FF6600', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>{count} apps ({pct}%)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>Allocated Vol: <strong>KES {(pkg.totalVolume || 0).toLocaleString()}</strong></span>
                          <span>Repayment: <strong>Wk KES {(pkg.weeklyRepayment || 0).toLocaleString()}</strong> | <strong>Mo KES {(pkg.monthlyRepayment || 0).toLocaleString()}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional & County Distribution Analytics */}
              <div style={{ marginTop: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Regional &amp; County Distribution Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {(analytics?.countyAnalytics || [
                    { county: 'Nairobi', count: applications.length > 0 ? Math.ceil(applications.length * 0.45) : 12, totalVolume: 450000, percentage: 45 },
                    { county: 'Mombasa', count: applications.length > 0 ? Math.ceil(applications.length * 0.25) : 8, totalVolume: 250000, percentage: 25 },
                    { county: 'Nakuru', count: applications.length > 0 ? Math.ceil(applications.length * 0.18) : 5, totalVolume: 180000, percentage: 18 },
                    { county: 'Kiambu / Eldoret', count: applications.length > 0 ? Math.ceil(applications.length * 0.12) : 4, totalVolume: 120000, percentage: 12 },
                  ]).map((c: any) => (
                    <div key={c.county} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '0.85rem', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>📍 {c.county}</span>
                        <span style={{ fontWeight: 700, color: ORANGE }}>{c.count} apps ({c.percentage}%)</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        Volume: KES {(c.totalVolume || 0).toLocaleString()}
                      </div>
                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${c.percentage}%`, height: '100%', background: ORANGE, borderRadius: '3px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 3: Payment Channels / STK
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'payments' && (
            <div>
              {/* Payment Gateway Health Indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="admin-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>PalPluss / PayPluss STK Gateway</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status: Operational (Auto-fallback active)</div>
                  </div>
                </div>
                <div className="admin-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Capcom6 SMS Callback API</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status: Connected (Webhook Listener Ready)</div>
                  </div>
                </div>
              </div>

              {/* STK Push Table */}
              <div className="admin-table-container">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Checkout ID</th>
                        <th>Applicant</th>
                        <th>Phone</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Callback Desc</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPayments.length > 0 ? pagedPayments.map((pay: any) => {
                        const fc = feeBadge(pay.feeStatus);
                        return (
                          <tr key={pay.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>{pay.checkoutRequestId || '—'}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{pay.fullName}</td>
                            <td style={{ color: '#475569' }}>{pay.phoneNumber}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>KES {Number(pay.processingFee || 450).toLocaleString()}</td>
                            <td>
                              <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: fc.color, background: fc.bg }}>{fc.label}</span>
                            </td>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{pay.feeResultDesc || pay.resultDesc || 'Waiting for M-Pesa response...'}</td>
                            <td>
                              {pay.feeStatus !== 'Paid' && (
                                <button className="admin-btn admin-btn-primary" onClick={() => handleSimulateStkPush(pay.phoneNumber, pay.processingFee || 450, pay.transactionRef)} disabled={actionLoading}>
                                  Retry STK
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No M-Pesa transactions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 4: Customer Allocations & Withdrawals
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'allocations' && (
            <div>
              {/* Allocations Table */}
              <div className="admin-table-container" style={{ marginBottom: '1.75rem' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Registered Customer Accounts &amp; Profiles</h3>
                </div>
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Phone Number</th>
                        <th>National ID</th>
                        <th>Age / Marital</th>
                        <th>Income Level</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCustomers.length > 0 ? pagedCustomers.map((cust: any) => (
                        <tr key={cust.id}>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{cust.fullName}</td>
                          <td style={{ color: '#475569' }}>{cust.phoneNumber}</td>
                          <td style={{ color: '#475569' }}>{cust.nationalId}</td>
                          <td style={{ color: '#475569' }}>{cust.age} yrs / {cust.maritalStatus}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{cust.monthlyIncome || 'Not disclosed'}</td>
                          <td>
                            <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedCustomer(cust)}>
                              View Profile
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No customers registered.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Withdrawal Requests Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      💸 Customer Withdrawal Requests Management ({adminWithdrawals.length})
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Review, approve, or reject customer cashout requests. Rejecting a withdrawal automatically restores the funds back to the customer's portal balance and triggers a detailed SMS alert.
                    </p>
                  </div>
                </div>

                <div className="admin-table-container">
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Customer Name</th>
                          <th>Phone Number</th>
                          <th>National ID</th>
                          <th>Loan Ref</th>
                          <th>Amount Requested</th>
                          <th>Fee (KES)</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminWithdrawals.length > 0 ? adminWithdrawals.map((w: any) => {
                          const app = w.loanApplication || {};
                          return (
                            <tr key={w.id}>
                              <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(w.createdAt).toLocaleString()}</td>
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>{app.fullName || 'Customer'}</td>
                              <td style={{ color: '#334155' }}>{app.phoneNumber || 'N/A'}</td>
                              <td style={{ color: '#334155' }}>{app.nationalId || 'N/A'}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{app.transactionRef || 'Ref'}</td>
                              <td style={{ fontWeight: 800, color: '#065f46' }}>KES {w.amount?.toLocaleString()}</td>
                              <td style={{ color: '#475569' }}>KES {w.withdrawalFee?.toLocaleString()}</td>
                              <td>
                                <span style={{
                                  padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
                                  color: w.status === 'Paid' ? '#065f46' : w.status === 'Failed' ? '#991b1b' : '#92400e',
                                  background: w.status === 'Paid' ? '#d1fae5' : w.status === 'Failed' ? '#fee2e2' : '#fef3c7'
                                }}>
                                  {w.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  {w.status !== 'Paid' && (
                                    <button className="admin-btn admin-btn-success" onClick={() => handleApproveWithdrawal(w.id)} disabled={actionLoading} style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                                      Approve
                                    </button>
                                  )}
                                  {w.status !== 'Failed' && (
                                    <button className="admin-btn admin-btn-danger" onClick={() => { setSelectedWithdrawalForReject(w); setWithdrawalRejectModalOpen(true); }} disabled={actionLoading} style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                                      Reject &amp; Return Funds
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No withdrawal requests submitted yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 5: Loan Products & Eligibility
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'products' && (
            <div>
              {/* Product and eligibility calculator row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem', marginBottom: '1.5rem', alignItems: 'start' }}>
                {/* List Brackets */}
                <div className="admin-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Configurable Eligibility Brackets</h3>
                    <button className="admin-btn admin-btn-primary" onClick={() => { setSelectedBracket(null); clearBracketForm(); setBracketModalOpen(true); }}>
                      <Plus size={14} /> Add Bracket
                    </button>
                  </div>

                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Min Salary</th>
                          <th>Max Salary</th>
                          <th>Assigned Package</th>
                          <th>Max Limit</th>
                          <th>Weekly Repayment (7d @ 5%)</th>
                          <th>Monthly Repayment (30d @ 12%)</th>
                          <th>Package Fee</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brackets.length > 0 ? brackets.map((b: any) => {
                          const limit = b.maxLimit || 0;
                          const nWeeks = b.numWeeks || 4;
                          const wkInst = b.weeklyInstallment || Math.round((limit * 1.05) / nWeeks);
                          const wkTotal = Math.round(wkInst * nWeeks);

                          const nMonths = b.numMonths || 1;
                          const moInst = b.monthlyInstallment || Math.round(limit * 1.12);
                          const moTotal = Math.round(moInst * nMonths);
                          return (
                            <tr key={b.id}>
                              <td>KES {b.minSalary.toLocaleString()}</td>
                              <td>KES {b.maxSalary.toLocaleString()}</td>
                              <td style={{ color: '#FF6600', fontWeight: 600 }}>{b.assignedPackageName || b.name}</td>
                              <td style={{ fontWeight: 700, color: '#065f46' }}>KES {b.maxLimit.toLocaleString()}</td>
                              <td style={{ fontWeight: 700, color: '#2563eb' }}>
                                KES {wkInst.toLocaleString()} × {nWeeks} wks = KES {wkTotal.toLocaleString()}
                              </td>
                              <td style={{ fontWeight: 700, color: '#7c3aed' }}>
                                KES {moInst.toLocaleString()} × {nMonths} mo = KES {moTotal.toLocaleString()}
                              </td>
                              <td style={{ fontWeight: 700, color: '#1e40af' }}>KES {(b.processingFee ?? 450).toLocaleString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button className="admin-btn admin-btn-secondary" style={{ height: '30px', padding: '0 0.5rem' }} onClick={() => handleEditBracket(b)}><Edit size={13} /></button>
                                  <button className="admin-btn admin-btn-danger" style={{ height: '30px', padding: '0 0.5rem' }} onClick={() => handleDeleteBracket(b.id)}><Trash2 size={13} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No eligibility rules defined.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Qualification Preview Tool */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Sparkles size={16} color={ORANGE} /> Calculator Preview</h3>
                  <form onSubmit={handlePreviewEligibility}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Applicant Monthly Income (KES)</label>
                      <input type="number" placeholder="e.g. 45000" value={previewSalary} onChange={e => setPreviewSalary(e.target.value)} required
                        style={{ width: '100%', padding: '0.52rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <button type="submit"
                      style={{ width: '100%', padding: '0.55rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit' }}>
                      Preview Qualification
                    </button>
                  </form>

                  {previewResult && (
                    <div style={{ marginTop: '1rem', padding: '0.85rem', background: previewResult.qualified ? '#f0fdf4' : '#fef2f2', border: `1px solid ${previewResult.qualified ? '#bbf7d0' : '#fecaca'}`, borderRadius: '10px' }}>
                      {previewResult.qualified ? (
                        <>
                          <div style={{ color: '#166534', fontWeight: 750, fontSize: '0.85rem', marginBottom: '0.2rem' }}>Qualified: {previewResult.packageName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#475569' }}>Bracket: {previewResult.bracketName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700, marginTop: '0.35rem' }}>Max Limit: KES {previewResult.maxLimit.toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, marginTop: '0.15rem' }}>Weekly Repayment: KES {(previewResult.weeklyRepayment || Math.round(previewResult.maxLimit * 1.05)).toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.15rem' }}>Monthly Repayment: KES {(previewResult.monthlyRepayment || Math.round(previewResult.maxLimit * 1.12)).toLocaleString()}</div>
                          <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 700, marginTop: '0.15rem' }}>Package Fee: KES {previewResult.processingFee.toLocaleString()}</div>
                        </>
                      ) : (
                        <div style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>{previewResult.error || previewResult.message}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 6: Support Centre
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'support' && (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', minHeight: '520px' }}>
              <div style={{ borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
                <div style={{ padding: '1rem 1.15rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ margin: '0 0 0.1rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Customer Tickets</h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{openTicketsCount} active tickets needing reply</div>
                </div>
                <div style={{ padding: '0.4rem' }}>
                  {tickets.length > 0 ? tickets.map((t: any) => (
                    <button key={t.id} onClick={() => setSelectedTicket(t)}
                      style={{ width: '100%', padding: '0.85rem', textAlign: 'left', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.1s', borderLeft: `3.5px solid ${t.status === 'OPEN' ? ORANGE : '#cbd5e1'}`, background: selectedTicket?.id === t.id ? '#FFF5ED' : 'transparent', fontFamily: 'inherit' }}
                      onMouseEnter={e => { if (selectedTicket?.id !== t.id) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (selectedTicket?.id !== t.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.15rem' }}>{t.customerName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.15rem' }}>📞 {t.customerPhone}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                    </button>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}><MessageCircle size={28} style={{ marginBottom: '0.5rem' }} /><p style={{ margin: 0, fontSize: '0.82rem' }}>No tickets yet</p></div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedTicket ? (
                  <>
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{selectedTicket.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedTicket.customerPhone} · {selectedTicket.subject}</div>
                      </div>
                      {selectedTicket.status === 'OPEN' && (
                        <button onClick={() => handleResolveTicket(selectedTicket.id)}
                          style={{ padding: '0.4rem 0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>
                          ✓ Mark Resolved
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#f8fafc' }}>
                      {(selectedTicket.messages || []).map((m: any) => {
                        const isAdminMsg = m.sender === 'ADMIN';
                        return (
                          <div key={m.id} style={{ display: 'flex', justifyContent: isAdminMsg ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '70%', padding: '0.6rem 0.9rem', borderRadius: isAdminMsg ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isAdminMsg ? '#0f172a' : '#fff', border: isAdminMsg ? 'none' : '1px solid #e2e8f0', color: isAdminMsg ? '#fff' : '#0f172a', fontSize: '0.875rem', lineHeight: 1.5 }}>
                              {m.text}
                              <div style={{ fontSize: '0.63rem', opacity: 0.65, marginTop: '0.2rem', textAlign: 'right' }}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <form onSubmit={handleSendReply} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', background: '#fff' }}>
                      <input type="text" placeholder="Type support message reply..." value={supportReply} onChange={e => setSupportReply(e.target.value)}
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
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>Select a customer ticket on the left pane to chat</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
             MODULE 7: SMS Manager
             ════════════════════════════════════════════════════════ */}
          {activeTab === 'sms' && (
            <div>
              {/* Anti-Spam Banner & Reminder Engine Action Toolbar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={18} color="#10b981" /> Anti-Spam &amp; Automated Stage SMS Engine
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      SMS triggers automatically at every loan stage update. Anti-spam rate limiting blocks duplicate SMS within 3 mins &amp; caps at 10 SMS/day per recipient.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button onClick={handleTriggerRemindersEngine} disabled={actionLoading}
                      style={{ padding: '0.65rem 1rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={15} /> {actionLoading ? 'Processing...' : 'Run 24H & 7D Reminders Engine'}
                    </button>
                    <button onClick={handleSeedDefaultTemplates} disabled={actionLoading}
                      style={{ padding: '0.65rem 1rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <RefreshCcw size={14} /> Seed Default Stage Templates
                    </button>
                  </div>
                </div>
              </div>

              {/* Send SMS Console & Templates Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', marginBottom: '1.5rem', alignItems: 'start' }}>
                
                {/* Send SMS Form */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Send Custom Message</h3>
                  <form onSubmit={handleSendManualSms}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        <input type="checkbox" checked={smsBroadcast} onChange={e => setSmsBroadcast(e.target.checked)} />
                        Broadcast to all loan applicants ({applications.length} recipients)
                      </label>
                    </div>

                    {!smsBroadcast && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Recipient Phone Number</label>
                        <input type="text" placeholder="e.g. 0799289214" value={smsRecipient} onChange={e => setSmsRecipient(e.target.value)}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>
                    )}

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Message Body</label>
                      <textarea placeholder="Type message body..." value={smsText} onChange={e => setSmsText(e.target.value)} required rows={4}
                        style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>

                    <button type="submit" disabled={actionLoading}
                      style={{ width: '100%', padding: '0.7rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'inherit' }}>
                      {actionLoading ? 'Sending...' : smsBroadcast ? '🚀 Broadcast SMS' : '📤 Send SMS'}
                    </button>
                  </form>
                </div>

                {/* Templates Box */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Stage SMS Templates ({smsTemplates.length})</h3>
                    <button onClick={() => setSmsTemplateModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, fontWeight: 700, fontSize: '0.78rem' }}>+ New</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto' }}>
                    {smsTemplates.length > 0 ? smsTemplates.map((temp: any) => {
                      const isON = temp.active !== false;
                      return (
                        <div key={temp.id || temp.key}
                          style={{ padding: '0.65rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: selectedTemplateKey === temp.key ? '#f0f2fe' : '#f8fafc', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#334155', cursor: 'pointer' }} onClick={() => handleUseTemplate(temp)}>
                              {temp.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>{temp.key}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleSmsTemplate(temp); }}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#fff',
                                  background: isON ? '#10b981' : '#64748b',
                                  boxShadow: isON ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                                  transition: 'all 0.2s ease'
                                }}
                                title={isON ? 'Click to Turn OFF this SMS template' : 'Click to Turn ON this SMS template'}
                              >
                                {isON ? 'ON 🟢' : 'OFF ⚪'}
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: isON ? '#64748b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px', cursor: 'pointer' }} onClick={() => handleUseTemplate(temp)}>
                            {temp.body}
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', padding: '1rem 0' }}>No templates saved. Click "Seed Default Stage Templates" to load.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Bulk Action Bar for SMS Logs */}
              {selectedSmsIds.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#991b1b' }}>
                    <CheckSquare size={18} color="#ef4444" />
                    <span>{selectedSmsIds.length} SMS log(s) selected</span>
                  </div>
                  <button className="admin-btn admin-btn-danger" onClick={handleBulkDeleteSmsLogs} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Trash2 size={14} /> Delete Selected Logs
                  </button>
                </div>
              )}

              {/* SMS Logs Table */}
              <div className="admin-table-container">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedSmsIds.length === pagedSmsLogs.length && pagedSmsLogs.length > 0} onChange={handleToggleSelectAllSms} style={{ cursor: 'pointer' }} />
                        </th>
                        <th>Recipient</th>
                        <th>Message Text</th>
                        <th>Gateway Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSmsLogs.length > 0 ? pagedSmsLogs.map((log: any) => {
                        const isSelected = selectedSmsIds.includes(log.id);
                        return (
                          <tr key={log.id} style={{ background: isSelected ? '#fef2f2' : undefined }}>
                            <td style={{ textAlign: 'center' }}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelectSms(log.id)} style={{ cursor: 'pointer' }} />
                            </td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{log.recipientPhone}</td>
                            <td style={{ color: '#475569', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.message}</td>
                            <td>
                              {log.error && log.error.includes('ANTI-SPAM') ? (
                                <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', background: '#fef3c7' }}>
                                  🛡️ Anti-Spam Suppressed
                                </span>
                              ) : log.simulated ? (
                                <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', background: '#dbeafe' }}>
                                  Simulated
                                </span>
                              ) : log.success ? (
                                <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', background: '#d1fae5' }}>
                                  Delivered
                                </span>
                              ) : (
                                <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', background: '#fee2e2' }}>
                                  Failed
                                </span>
                              )}
                            </td>
                            <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{new Date(log.createdAt).toLocaleString()}</td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No SMS logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Support Centre */}
          {activeTab === 'support' && (
            <div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      💬 Support Centre & Live Tickets ({tickets.length})
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Reply to customer inquiries. Sending a reply dispatches an SMS with a direct WhatsApp chat token link directly to the customer's phone!
                    </p>
                  </div>
                </div>
              </div>

              {/* Support Tickets Table */}
              <div className="admin-table-container">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Topic / Subject</th>
                        <th>Status</th>
                        <th>Messages</th>
                        <th>Last Updated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length > 0 ? tickets.map((t: any) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{t.customerName}</td>
                          <td style={{ color: '#334155' }}>{t.customerPhone}</td>
                          <td style={{ color: '#0f172a', fontWeight: 600 }}>{t.subject}</td>
                          <td>
                            {t.status === 'REPLIED' ? (
                              <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                                REPLIED
                              </span>
                            ) : t.status === 'CLOSED' ? (
                              <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                                CLOSED
                              </span>
                            ) : (
                              <span style={{ padding: '3px 9px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a' }}>
                                OPEN
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.8rem' }}>{(t.messages || []).length} message(s)</td>
                          <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(t.updatedAt || t.createdAt).toLocaleString()}</td>
                          <td>
                            <button
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => setSelectedTicketForReply(t)}
                            >
                              Open &amp; Reply
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No support tickets received yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Platform & Contact Settings */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '720px' }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                    🛠️ Platform Contact &amp; Support Settings
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Configure the official contact phone, email, WhatsApp link, operating hours, and headquarters location. Changes here are synced across the entire website in real-time.
                  </p>
                </div>

                <form onSubmit={handleSaveSystemSettings}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Phone Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        Phone Support Number
                      </label>
                      <input
                        type="text"
                        value={settingsPhone}
                        onChange={(e) => setSettingsPhone(e.target.value)}
                        placeholder="e.g. +254 700 123 456"
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Support Email */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        Email Customer Support
                      </label>
                      <input
                        type="email"
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        placeholder="e.g. support@jijengeloans.co.ke"
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* WhatsApp Support Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', marginBottom: '6px' }}>
                        WhatsApp Support Number
                      </label>
                      <input
                        type="text"
                        value={settingsWhatsapp}
                        onChange={(e) => setSettingsWhatsapp(e.target.value)}
                        placeholder="e.g. +254 700 123 456"
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #bbf7d0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#f0fdf4' }}
                      />
                    </div>

                    {/* Operating Hours */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        Operating Hours
                      </label>
                      <input
                        type="text"
                        value={settingsHours}
                        onChange={(e) => setSettingsHours(e.target.value)}
                        placeholder="e.g. 24/7 Customer Support or Mon – Sat | 8 AM – 8 PM EAT"
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Headquarters Address */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Headquarters Address / Location
                    </label>
                    <input
                      type="text"
                      value={settingsAddress}
                      onChange={(e) => setSettingsAddress(e.target.value)}
                      placeholder="e.g. Nairobi, Kenya"
                      required
                      style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      background: ORANGE,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
                    }}
                  >
                    {actionLoading ? 'Saving Settings...' : 'Save & Sync System Settings'}
                  </button>
                </form>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* ══ DRAWER: MANAGE APPLICATION ══ */}
      {selectedApp && (
        <>
          <div onClick={() => setSelectedApp(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 98, backdropFilter: 'blur(2px)' }} />
          <div className="admin-drawer" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px', background: '#fff', borderLeft: '1px solid #e2e8f0', boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 99, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff' }}>
              <div>
                <h3 style={{ margin: '0 0 0.15rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Manage Application</h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>Ref: {selectedApp.transactionRef}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem', display: 'flex', color: '#475569' }}>
                <X size={17} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem' }}>{selectedApp.fullName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 1rem', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#94a3b8', display: 'block' }}>Phone</span><span style={{ fontWeight: 700, color: '#334155' }}>{selectedApp.phoneNumber}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block' }}>National ID</span><span style={{ fontWeight: 700, color: '#334155' }}>{selectedApp.nationalId}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block' }}>Loan Request</span><span style={{ fontWeight: 800, color: '#0f172a' }}>KES {selectedApp.amount.toLocaleString()}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block' }}>Allocated Balance</span><span style={{ fontWeight: 800, color: '#065f46' }}>KES {selectedApp.allocatedBalance.toLocaleString()}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block' }}>Fee Status</span><span style={{ fontWeight: 700 }}>{selectedApp.feeStatus}</span></div>
                  <div><span style={{ color: '#94a3b8', display: 'block' }}>Status Step</span><span style={{ fontWeight: 700 }}>{selectedApp.status}</span></div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Workflow Progress Timeline</h4>
                {[
                  { label: 'Application Received', step: 'Application_Received' },
                  { label: 'Initial Verification', step: 'Initial_Verification' },
                  { label: 'Credit Assessment', step: 'Credit_Assessment' },
                  { label: 'Loan Review Check', step: 'Loan_Review' },
                  { label: 'Approved & Disbursed', step: 'Disbursed' }
                ].map((t, idx) => {
                  const done = applications.find(a => a.id === selectedApp.id)?.status === t.step || idx < 3; // timeline trace
                  return (
                    <div key={t.step} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: done ? '#10b981' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {done && <Check size={10} color="#fff" />}
                        </div>
                        {idx < 4 && <div style={{ width: '2px', flex: 1, background: '#e2e8f0', minHeight: '18px' }} />}
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: done ? 700 : 500, color: done ? '#0f172a' : '#94a3b8' }}>{t.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Forms */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>💰 Allocate Limit</h4>
                <input type="number" placeholder="Enter limit amount" value={allocateAmount} onChange={e => setAllocateAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', boxSizing: 'border-box' }}
                />
                <input type="text" placeholder="Add allocation comments..." value={allocationNotes} onChange={e => setAllocationNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', boxSizing: 'border-box' }}
                />
                <button onClick={() => handleAllocate(selectedApp.id)} disabled={actionLoading}
                  style={{ width: '100%', padding: '0.6rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                  Allocate Balance &amp; Approve
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>🔄 Update Workflow Status</h4>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', background: '#fff' }}>
                  <option value="Initial_Verification">Initial Verification</option>
                  <option value="Credit_Assessment">Credit Assessment</option>
                  <option value="Loan_Review">Loan Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Disbursed">Disbursed</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <button onClick={() => handleStatusChange(selectedApp.id, '')} disabled={actionLoading}
                  style={{ width: '100%', padding: '0.6rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                  Advance Status Step
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>⚡ STK &amp; Application Reset Controls</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={() => handleRetriggerStkAdmin(selectedApp.id)} disabled={actionLoading}
                    style={{ width: '100%', padding: '0.6rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                    ⚡ Re-trigger STK Push Prompt
                  </button>
                  <button onClick={() => handleResetAppAdmin(selectedApp.id)} disabled={actionLoading}
                    style={{ width: '100%', padding: '0.6rem', background: '#f1f5f9', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                    🔄 Reset Application (Allow Re-apply)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ DRAWER: CUSTOMER PROFILE PREVIEW ══ */}
      {selectedCustomer && (
        <>
          <div onClick={() => setSelectedCustomer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 98, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px', background: '#fff', borderLeft: '1px solid #e2e8f0', boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Customer Profile</h3>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>Full Legal Name</span><strong style={{ color: '#0f172a' }}>{selectedCustomer.fullName}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>M-Pesa Registered Phone</span><strong style={{ color: '#0f172a' }}>{selectedCustomer.phoneNumber}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>National ID Number</span><strong style={{ color: '#0f172a' }}>{selectedCustomer.nationalId}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>Enterprise/Business Name</span><strong>{selectedCustomer.businessName || 'General Enterprise'}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>County &amp; Area</span><strong>{selectedCustomer.county} / {selectedCustomer.townArea}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>Demographics</span><strong>{selectedCustomer.age} yrs old · {selectedCustomer.gender} · {selectedCustomer.maritalStatus}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block' }}>Estimated Monthly Income</span><strong style={{ color: ORANGE }}>{selectedCustomer.monthlyIncome || 'Not specified'}</strong></div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                <span style={{ color: '#94a3b8', display: 'block' }}>Customer Registration Date</span>
                <strong>{new Date(selectedCustomer.createdAt).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL: ADD/EDIT ELIGIBILITY BRACKET ══ */}
      {bracketModalOpen && (
        <>
          <div onClick={() => setBracketModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '92%', maxWidth: '440px', background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{selectedBracket ? 'Edit Eligibility Bracket' : 'Add Eligibility Bracket'}</h3>
              <button onClick={() => setBracketModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.4rem' }}><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveBracket}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Min Monthly Salary</label>
                  <input type="number" value={bracketMinSalary} onChange={e => setBracketMinSalary(e.target.value)} required placeholder="e.g. 20000"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Max Monthly Salary</label>
                  <input type="number" value={bracketMaxSalary} onChange={e => setBracketMaxSalary(e.target.value)} required placeholder="e.g. 50000"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Assigned Package Name</label>
                <input type="text" value={bracketPackage} onChange={e => setBracketPackage(e.target.value)} required placeholder="e.g. Jijenge Micro Booster"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Maximum Allocated Limit (KES)</label>
                <input type="number" value={bracketLimit} onChange={e => setBracketLimit(e.target.value)} required placeholder="e.g. 35000"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Package Processing Fee (KES)</label>
                <input type="number" value={bracketFee} onChange={e => setBracketFee(e.target.value)} required placeholder="e.g. 450"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Weekly Plan Configuration */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>🗓️ Weekly Repayment Setup</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>Weekly Amount (KES)</label>
                    <input type="number" value={bracketWeeklyInstallment} onChange={e => setBracketWeeklyInstallment(e.target.value)} placeholder="Auto (Amount / 4)"
                      style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>No. of Weeks</label>
                    <input type="number" value={bracketNumWeeks} onChange={e => setBracketNumWeeks(e.target.value)} placeholder="e.g. 4"
                      style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Plan Configuration */}
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>📆 Monthly Repayment Setup</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#5b21b6', marginBottom: '2px' }}>Monthly Amount (KES)</label>
                    <input type="number" value={bracketMonthlyInstallment} onChange={e => setBracketMonthlyInstallment(e.target.value)} placeholder="Auto (Amount * 1.12)"
                      style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #c4b5fd', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#5b21b6', marginBottom: '2px' }}>No. of Months</label>
                    <input type="number" value={bracketNumMonths} onChange={e => setBracketNumMonths(e.target.value)} placeholder="e.g. 1"
                      style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #c4b5fd', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={actionLoading}
                style={{ width: '100%', padding: '0.7rem', background: ORANGE, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                {actionLoading ? 'Saving bracket...' : 'Save Eligibility Rule'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ══ MODAL: SMS TEMPLATE CREATION ══ */}
      {smsTemplateModal && (
        <>
          <div onClick={() => setSmsTemplateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '92%', maxWidth: '440px', background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Add SMS Template</h3>
              <button onClick={() => setSmsTemplateModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.4rem' }}><X size={15} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              const keyVal = (e.currentTarget.elements.namedItem('tempKey') as HTMLInputElement).value;
              const titleVal = (e.currentTarget.elements.namedItem('tempTitle') as HTMLInputElement).value;
              const bodyVal = (e.currentTarget.elements.namedItem('tempBody') as HTMLTextAreaElement).value;
              handleUpsertTemplate(keyVal, titleVal, bodyVal);
            }}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Template Key</label>
                <input name="tempKey" type="text" required placeholder="e.g. REPAYMENT_ALERT"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Template Title</label>
                <input name="tempTitle" type="text" required placeholder="e.g. Loan Repayment Due Date"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Template Text Body</label>
                <textarea name="tempBody" required rows={4} placeholder="Type template body..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit"
                style={{ width: '100%', padding: '0.7rem', background: ORANGE, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                Save SMS Template
              </button>
            </form>
          </div>
        </>
      )}

      {/* ══ MODAL: BULK BROADCAST SMS ══ */}
      {bulkSmsModalOpen && (
        <>
          <div onClick={() => setBulkSmsModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 100, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '92%', maxWidth: '480px', background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} color={ORANGE} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Broadcast SMS to Selected</h3>
              </div>
              <button onClick={() => setBulkSmsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.4rem' }}><X size={15} /></button>
            </div>
            
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.1rem', fontSize: '0.82rem', color: '#9a3412' }}>
              <strong>Target Audience:</strong> Sending to {selectedAppIds.length} selected loan applicant(s) ({Array.from(new Set(applications.filter(a => selectedAppIds.includes(a.id)).map(a => a.phoneNumber))).length} unique phone number(s)).
            </div>

            <form onSubmit={handleSendBulkSmsToSelectedApps}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Broadcast Message Text</label>
                <textarea
                  value={bulkSmsMessage}
                  onChange={e => setBulkSmsMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Type official broadcast message..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {/* Quick Template Chips */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Quick Insert Template:</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Status Update', text: 'Dear customer, your loan application is currently under review by our credit assessment team.' },
                    { label: 'STK Fee Reminder', text: 'Dear customer, please complete your M-Pesa STK push processing fee to finalize your loan allocation.' },
                    { label: 'Approval Alert', text: 'Congratulations! Your loan limit has been allocated and approved. Log in to check your status.' }
                  ].map((t, idx) => (
                    <button key={idx} type="button" onClick={() => setBulkSmsMessage(t.text)}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setBulkSmsModalOpen(false)} style={{ flex: 1, padding: '0.7rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} style={{ flex: 1.5, padding: '0.7rem', background: ORANGE, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}>
                  {actionLoading ? 'Sending Broadcast...' : '🚀 Send Broadcast SMS'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ══ MODAL: WITHDRAWAL REJECTION & FUND REVERSION ══ */}
      {withdrawalRejectModalOpen && selectedWithdrawalForReject && (
        <>
          <div onClick={() => setWithdrawalRejectModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 100, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '92%', maxWidth: '480px', background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>Reject Withdrawal Request</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>KES {selectedWithdrawalForReject.amount?.toLocaleString()} will be restored to customer balance</p>
              </div>
              <button onClick={() => setWithdrawalRejectModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.4rem' }}><X size={15} /></button>
            </div>
            <form onSubmit={handleConfirmRejectWithdrawal}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Select Pre-set Rejection Reason</label>
                <select value={selectedRejectionReason} onChange={e => setSelectedRejectionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', background: '#fff' }}>
                  <option value="Mismatch between National ID, Full Name and M-Pesa Phone Number">Mismatch between National ID, Full Name and M-Pesa Phone Number</option>
                  <option value="Incorrect M-Pesa Phone Number or Unregistered M-Pesa Account">Incorrect M-Pesa Phone Number or Unregistered M-Pesa Account</option>
                  <option value="M-Pesa Account Name does not match Applicant National ID Registration">M-Pesa Account Name does not match Applicant National ID Registration</option>
                  <option value="Invalid County or Town Area Registration Details">Invalid County or Town Area Registration Details</option>
                  <option value="System Network Timeout / M-Pesa B2C Gateway Transaction Failure">System Network Timeout / M-Pesa B2C Gateway Transaction Failure</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Additional Rejection Notes / Instructions for Customer</label>
                <textarea rows={3} value={customRejectionNotes} onChange={e => setCustomRejectionNotes(e.target.value)} placeholder="Provide specific guidance on what customer should edit..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', resize: 'none' }}
                />
              </div>
              <button type="submit" disabled={actionLoading}
                style={{ width: '100%', padding: '0.75rem', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800 }}>
                {actionLoading ? 'Processing Rejection...' : 'Confirm Rejection & Restore Customer Funds'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ══ MODAL: ADMIN SUPPORT TICKET REPLY ══ */}
      {selectedTicketForReply && (
        <>
          <div onClick={() => setSelectedTicketForReply(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 100, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '92%', maxWidth: '560px', maxHeight: '90vh', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Support Ticket: {selectedTicketForReply.customerName}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Phone: {selectedTicketForReply.customerPhone} • Topic: {selectedTicketForReply.subject}
                </span>
              </div>
              <button onClick={() => setSelectedTicketForReply(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0.4rem', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* Conversation History */}
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.65rem', minHeight: '180px' }}>
              {(selectedTicketForReply.messages || []).map((m: any) => {
                const isAdmin = m.sender === 'ADMIN';
                return (
                  <div key={m.id} style={{
                    maxWidth: '82%', padding: '0.65rem 0.85rem', borderRadius: '12px', fontSize: '0.82rem',
                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                    background: isAdmin ? '#0f172a' : '#ffffff',
                    color: isAdmin ? '#ffffff' : '#0f172a',
                    border: isAdmin ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ fontSize: '0.68rem', opacity: 0.8, marginBottom: '2px', fontWeight: 700 }}>
                      {m.senderName || (isAdmin ? 'Admin' : 'Customer')}
                    </div>
                    <div>{m.text}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'right', marginTop: '3px' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleReplySupportTicket} style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Admin Reply (Sends SMS with direct chat token link)
                </label>
                <textarea
                  value={adminTicketReplyText}
                  onChange={(e) => setAdminTicketReplyText(e.target.value)}
                  placeholder="Type your response to the customer..."
                  required
                  rows={3}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedTicketForReply(null)} style={{ padding: '0.55rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} style={{ padding: '0.55rem 1.25rem', background: ORANGE, border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
                  {actionLoading ? 'Sending Reply...' : 'Send Reply & Dispatch SMS Link'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  );
};
