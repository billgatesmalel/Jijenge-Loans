import React, { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CreditCard } from 'lucide-react';

interface TrackLoanViewProps {
  onTabChange: (tabId: string) => void;
  onOpenSupport: () => void;
}

export const TrackLoanView: React.FC<TrackLoanViewProps> = ({ onTabChange, onOpenSupport }) => {
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
    if (loan && (loan.status === 'Pending_STK_Fee_Payment' || loan.feeStatus === 'Pending_STK_Push' || loan.feeStatus === 'Processing')) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/loans/track/${loan.transactionRef}`);
          const data = await res.json();
          if (data.success && data.loan) {
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
      const res = await fetch(`/api/loans/track/${searchQuery.trim()}`);
      const data = await res.json();
      if (data.success && data.loan) {
        setLoan(data.loan);
        setStages(data.stages || []);
      } else {
        setError(data.message || 'No loan application record found matching that query.');
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
    if (!loan) return;
    setPaymentLoading(true);
    setPaymentMessage('');
    setPaymentError('');

    try {
      const res = await fetch('/api/payments/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef: loan.transactionRef,
          phoneNumber: loan.phoneNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentMessage(data.message || 'STK Push sent successfully. Please check your phone for the M-Pesa PIN prompt.');
        const trackRes = await fetch(`/api/loans/track/${loan.transactionRef}`);
        const trackData = await trackRes.json();
        if (trackData.success && trackData.loan) {
          setLoan(trackData.loan);
        }
      } else {
        setPaymentError(data.message || 'Failed to trigger M-Pesa STK push. Please try again.');
      }
    } catch (err) {
      setPaymentError('Connection error. Failed to initiate payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadgeConfig = (status: string) => {
    if (!status) return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', text: 'Unknown' };
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

  return (
    <div className="container" style={{ maxWidth: '900px', paddingBottom: '4rem' }}>
      {/* Title Header */}
      <div className="section-title-wrap text-center">
        <span className="sub-tag">Real-Time Status</span>
        <h2 className="section-heading">Track Loan Application</h2>
        <p className="section-subheading">
          Check the real-time status of your credit assessment, payment approval, and M-Pesa disbursement.
        </p>
      </div>

      {/* Search Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '2.25rem 1.75rem',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          margin: '0 auto 2.5rem',
          maxWidth: '820px',
        }}
      >
        <form onSubmit={handleSearch}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="track-query"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.5rem',
                fontFamily: 'inherit',
              }}
            >
              Enter National ID, M-Pesa Phone Number, or Application Reference (Ref)
            </label>
            <input
              type="text"
              id="track-query"
              placeholder="e.g. BL-XXXX-XXXX or 2547XXXXXXXX"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1.1rem',
                minHeight: '48px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#FF6600';
                e.target.style.boxShadow = '0 0 0 3px rgba(255,102,0,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#FFA366' : '#FF6600',
                color: '#ffffff',
                border: 'none',
                padding: '0.85rem 1.85rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(255,102,0,0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '48px',
                fontFamily: 'inherit',
                transition: 'background 0.2s ease, transform 0.15s ease',
                flex: '1 1 200px',
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#E55C00';
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#FF6600';
              }}
            >
              <Search size={16} aria-hidden="true" />
              <span>{loading ? 'Searching...' : 'Check Status'}</span>
            </button>

            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: '#f1f5f9',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  minHeight: '48px',
                  fontFamily: 'inherit',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
              >
                <X size={16} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </form>

        {error && (
          <div
            style={{
              marginTop: '1.25rem',
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              color: '#991b1b',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Search Result Card */}
      {loan && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            padding: '2.25rem 1.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            maxWidth: '820px',
            margin: '0 auto',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
              borderBottom: '1.5px solid #f1f5f9',
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#FF6600',
                  background: '#FFF5ED',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  border: '1px solid #FFD6B3',
                  letterSpacing: '0.02em',
                }}
              >
                Ref: {loan.transactionRef}
              </span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.65rem', marginBottom: 0, color: '#0f172a', fontFamily: 'inherit' }}>
                {loan.fullName}
              </h3>
            </div>

            <span
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '20px',
                fontSize: '0.825rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: getStatusBadgeConfig(loan.status).bg,
                color: getStatusBadgeConfig(loan.status).color,
                border: `1.5px solid ${getStatusBadgeConfig(loan.status).border}`,
              }}
            >
              {getStatusBadgeConfig(loan.status).text}
            </span>
          </div>

          {/* Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1.25rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.35rem',
              marginBottom: '2rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Loan Amount Matched
              </span>
              <strong style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                KES {loan.amount.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Processing Fee
              </span>
              <strong style={{ fontSize: '1.35rem', color: '#0284c7', fontWeight: 800 }}>
                KES {loan.processingFee.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Fee Status
              </span>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: loan.feeStatus === 'Paid' ? '#047857' : '#b45309',
                }}
              >
                {loan.feeStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Date Applied
              </span>
              <strong style={{ fontSize: '0.925rem', color: '#0f172a', fontWeight: 700 }}>
                {new Date(loan.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </div>
          </div>

          {/* Fee Payment Prompt Block if unpaid */}
          {(loan.status === 'Pending_STK_Fee_Payment' || loan.feeStatus === 'Pending_STK_Push') && (
            <div
              style={{
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.5rem 0', fontFamily: 'inherit' }}>
                Action Required: Complete Processing Fee Payment
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                Your application is pre-approved for <strong>KES {loan.amount.toLocaleString()}</strong>. To complete assessment and disburse funds, pay the processing fee of <strong>KES {loan.processingFee.toLocaleString()}</strong> via M-Pesa STK push.
              </p>

              <button
                type="button"
                onClick={triggerPayment}
                disabled={paymentLoading}
                style={{
                  background: '#FF6600',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: paymentLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(255,102,0,0.28)',
                }}
              >
                <CreditCard size={16} aria-hidden="true" />
                <span>{paymentLoading ? 'Triggering prompt...' : 'Pay Processing Fee Now'}</span>
              </button>

              {paymentMessage && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', fontWeight: 700, color: '#047857' }}>
                  {paymentMessage}
                </p>
              )}
              {paymentError && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', fontWeight: 700, color: '#991b1b' }}>
                  {paymentError}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          {stages.length > 0 && (
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', fontFamily: 'inherit' }}>
                Application Process Timeline
              </h4>

              <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '7px',
                    top: '10px',
                    bottom: '10px',
                    width: '2px',
                    background: '#e2e8f0',
                  }}
                />

                {stages.map((stage, idx) => {
                  const isCurrent = loan.status === stage.name;
                  const isCompleted = idx <= stages.findIndex((s) => s.name === loan.status);

                  return (
                    <div key={stage.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '-2rem',
                          top: '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: isCurrent ? '#FF6600' : isCompleted ? '#10b981' : '#cbd5e1',
                          border: isCurrent ? '3px solid #FFD6B3' : 'none',
                          boxSizing: 'border-box',
                          zIndex: 2,
                        }}
                      />

                      <div>
                        <strong
                          style={{
                            fontSize: '0.925rem',
                            color: isCurrent ? '#FF6600' : isCompleted ? '#0f172a' : '#94a3b8',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                          }}
                        >
                          {stage.name.replace(/_/g, ' ')}
                        </strong>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0', lineHeight: 1.5 }}>
                          {stage.description}
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
