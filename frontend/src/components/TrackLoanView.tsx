import React, { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CreditCard, ShieldCheck } from 'lucide-react';

interface TrackLoanViewProps {
  onTabChange?: (tabId: string) => void;
  onOpenSupport?: () => void;
}

export const TrackLoanView: React.FC<TrackLoanViewProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loan, setLoan] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);

  // Payment states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Status polling for active/pending loans
  useEffect(() => {
    let intervalId: any;
    if (loan?.status === 'Pending_STK_Fee_Payment' || loan?.feeStatus === 'Pending_STK_Push' || loan?.feeStatus === 'Processing') {
      intervalId = setInterval(async () => {
        try {
          if (!loan?.transactionRef) return;
          const res = await fetch(`/api/loans/track/${loan.transactionRef}`);
          const data = await res.json();
          if (data?.success && data?.loan) {
            setLoan(data.loan);
            if (data.loan.feeStatus === 'Paid') {
              clearInterval(intervalId);
            }
          }
        } catch (e) {
          console.error('Tracking poll error:', e);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loan]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setLoan(null);

    try {
      const res = await fetch(`/api/loans/track/${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data?.success && data?.loan) {
        setLoan(data.loan);
        setStages(Array.isArray(data.stages) ? data.stages : []);
      } else {
        setError(data?.message || 'No loan application record found matching that query.');
      }
    } catch (err) {
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setLoan(null);
    setError('');
  };

  const triggerPayment = async () => {
    if (!loan?.transactionRef) return;
    setPaymentLoading(true);
    setPaymentMessage('');
    setPaymentError('');

    try {
      const res = await fetch('/api/payments/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef: loan.transactionRef,
          phoneNumber: loan.phoneNumber || '',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentMessage(data?.message || 'STK Push sent successfully. Please check your phone for the M-Pesa PIN prompt.');
        const trackRes = await fetch(`/api/loans/track/${loan.transactionRef}`);
        const trackData = await trackRes.json();
        if (trackData?.success && trackData?.loan) {
          setLoan(trackData.loan);
        }
      } else {
        setPaymentError(data?.message || 'Failed to trigger M-Pesa STK push. Please try again.');
      }
    } catch (err) {
      setPaymentError('Connection error. Failed to initiate payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadgeConfig = (status: any) => {
    if (!status || typeof status !== 'string') {
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', text: 'Pending Assessment' };
    }
    const s = status.toLowerCase();
    if (s.includes('disbursed') || s.includes('approved') || s.includes('paid')) {
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', text: status.replace(/_/g, ' ') };
    }
    if (s.includes('review') || s.includes('submitted') || s.includes('pending') || s.includes('processing')) {
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', text: status.replace(/_/g, ' ') };
    }
    if (s.includes('rejected') || s.includes('failed') || s.includes('cancel')) {
      return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', text: status.replace(/_/g, ' ') };
    }
    return { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', text: status.replace(/_/g, ' ') };
  };

  const badgeConfig = getStatusBadgeConfig(loan?.status);

  return (
    <div className="container" style={{ maxWidth: '840px', paddingBottom: '3rem' }}>
      {/* Title Header */}
      <div className="section-title-wrap text-center" style={{ marginBottom: '2.5rem' }}>
        <span className="sub-tag">REAL-TIME APPLICATION STATUS</span>
        <h1 className="section-heading">Track Your Loan Application</h1>
        <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
          Check the real-time status of your credit assessment, payment approval, and M-Pesa disbursement.
        </p>
      </div>

      {/* Tracking Form Card */}
      <div className="apply-step-card" style={{ marginBottom: loan ? '2rem' : '0' }}>
        <form onSubmit={handleSearch}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="track-query" className="jijenge-label">
              National ID / Phone / Reference
            </label>
            <input
              type="text"
              id="track-query"
              placeholder="Enter National ID, Phone number, or Application Reference (e.g. BL-XXXX-XXXX)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="jijenge-input"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ flex: '1', minWidth: '160px', justifyContent: 'center' }}
            >
              <Search size={18} aria-hidden="true" />
              <span>{loading ? 'Searching...' : 'Check Status'}</span>
            </button>

            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary"
                style={{ padding: '0.85rem 1.25rem' }}
              >
                <X size={18} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="jijenge-alert jijenge-alert-error" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <ShieldCheck size={16} style={{ color: 'var(--brand-emerald)' }} />
          <span>Secure and real-time tracking via Central Bank credit API</span>
        </div>
      </div>

      {/* Search Result Card */}
      {loan && (
        <div className="apply-step-card">
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <span className="jijenge-badge jijenge-badge-warning" style={{ fontSize: '0.75rem' }}>
                Ref: {loan.transactionRef || 'N/A'}
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--brand-navy)', marginTop: '0.5rem', marginBottom: 0 }}>
                {loan.fullName || 'Valued Customer'}
              </h2>
            </div>

            <span className={`jijenge-badge jijenge-badge-${
              badgeConfig.text.toLowerCase().includes('disbursed') || badgeConfig.text.toLowerCase().includes('approved') || badgeConfig.text.toLowerCase().includes('paid')
                ? 'success'
                : badgeConfig.text.toLowerCase().includes('rejected') || badgeConfig.text.toLowerCase().includes('failed') || badgeConfig.text.toLowerCase().includes('cancel')
                  ? 'error'
                  : 'warning'
            }`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
              {badgeConfig.text}
            </span>
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>
                Matched Amount
              </span>
              <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--brand-navy)' }}>
                KES {(loan.amount || 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>
                Verification Fee
              </span>
              <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--brand-orange)' }}>
                KES {(loan.processingFee || 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>
                Fee Status
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: loan.feeStatus === 'Paid' ? '#059669' : '#d97706' }}>
                {(loan.feeStatus || 'Pending').replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>
                Date Applied
              </span>
              <strong style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand-navy)' }}>
                {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }) : 'N/A'}
              </strong>
            </div>
          </div>

          {/* Fee Payment Prompt Block if unpaid */}
          {(loan.status === 'Pending_STK_Fee_Payment' || loan.feeStatus === 'Pending_STK_Push') && (
            <div className="jijenge-alert jijenge-alert-info" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.25rem', marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.5rem' }}>
                Action Required: Complete Processing Fee Payment
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem', lineHeight: 1.5 }}>
                Your application is pre-approved for <strong>KES {(loan.amount || 0).toLocaleString()}</strong>. To complete assessment and disburse funds, pay the processing fee of <strong>KES {(loan.processingFee || 0).toLocaleString()}</strong> via M-Pesa STK push.
              </p>

              <button
                type="button"
                onClick={triggerPayment}
                disabled={paymentLoading}
                className="btn-primary"
                style={{ padding: '0.7rem 1.25rem', fontSize: '0.9rem' }}
              >
                <CreditCard size={16} aria-hidden="true" />
                <span>{paymentLoading ? 'Triggering prompt...' : 'Pay Processing Fee Now'}</span>
              </button>

              {paymentMessage && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#059669', margin: '0.75rem 0 0' }}>
                  {paymentMessage}
                </p>
              )}
              {paymentError && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', margin: '0.75rem 0 0' }}>
                  {paymentError}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          {Array.isArray(stages) && stages.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '1.25rem' }}>
                Application Process Timeline
              </h3>

              <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: '#e2e8f0' }} />

                {stages.map((stage, idx) => {
                  const stageName = stage?.name || '';
                  const loanStatus = loan?.status || '';
                  const isCurrent = loanStatus === stageName;
                  const completedIdx = stages.findIndex((s) => s?.name === loanStatus);
                  const isCompleted = completedIdx !== -1 && idx <= completedIdx;

                  return (
                    <div key={stage?.id || idx} style={{ position: 'relative', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '-2rem',
                          top: '4px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          zIndex: 1,
                          background: isCurrent ? '#FF6600' : isCompleted ? '#10B981' : '#cbd5e1',
                          border: isCurrent ? '3px solid #FFF5ED' : 'none',
                        }}
                      />

                      <div>
                        <strong
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 800,
                            color: isCurrent ? '#FF6600' : isCompleted ? 'var(--brand-navy)' : '#94a3b8',
                          }}
                        >
                          {stageName.replace(/_/g, ' ')}
                        </strong>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0', lineHeight: 1.5 }}>
                          {stage?.description || ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackLoanView;
