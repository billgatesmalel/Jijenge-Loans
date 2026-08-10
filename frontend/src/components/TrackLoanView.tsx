import React, { useState, useEffect } from 'react';

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

  // Status polling for paid loans
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
        // Refresh status
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="track-header">
        <div className="track-nav-container">
          <a href="#home" className="track-brand" onClick={() => onTabChange('home')}>
            <img src="/logo.png" alt="Jijenge Loans" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
            <span>Jijenge Loans</span>
          </a>
          <div className="track-nav-links">
            <a href="#home" className="track-nav-link" onClick={() => onTabChange('home')}>Home</a>
            <button className="track-nav-link" onClick={onOpenSupport} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Support Chat</button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="track-container">
        <div className="track-hero">
          <h1 className="track-title">Track Loan Application</h1>
          <p className="track-subtitle">
            Check the real-time status of your credit assessment, payment approval, and M-Pesa disbursement.
          </p>
        </div>

        {/* Search Card */}
        <div className="track-search-card">
          <form onSubmit={handleSearch}>
            <div className="form-group-track">
              <label className="form-label-track" htmlFor="track-query">
                Enter National ID, M-Pesa Phone Number, or Application Reference (Ref)
              </label>
              <input
                type="text"
                id="track-query"
                className="input-track"
                placeholder="e.g. BL-XXXX-XXXX or 2547XXXXXXXX or ID Number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
            </div>

            <div className="track-btn-group">
              <button type="submit" className="btn-track-submit" disabled={loading}>
                {loading ? 'Searching...' : '🔍 Check Status'}
              </button>
              <button type="button" className="btn-track-clear" onClick={handleClear}>
                Clear
              </button>
            </div>
          </form>

          {error && (
            <div className="track-alert track-alert-error" style={{ display: 'block' }}>
              {error}
            </div>
          )}
        </div>

        {/* Search Result */}
        {loan && (
          <div className="app-summary-card">
            <div className="app-summary-header">
              <div>
                <span className="app-ref-badge">{loan.transactionRef}</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem', color: '#0f172a' }}>
                  {loan.fullName}
                </h2>
              </div>
              <span className={`status-badge-pill`} style={{
                background: loan.status.includes('Disbursed') || loan.status.includes('Approved') ? '#ecfdf5' : '#fffbeb',
                color: loan.status.includes('Disbursed') || loan.status.includes('Approved') ? '#047857' : '#b45309',
                border: `1.5px solid ${loan.status.includes('Disbursed') || loan.status.includes('Approved') ? '#a7f3d0' : '#fde68a'}`
              }}>
                ℹ️ {loan.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Info Grid */}
            <div className="info-grid-track">
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>LOAN AMOUNT MATCHED</span>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  KES {loan.amount.toLocaleString()}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>PROCESSING FEE</span>
                <strong style={{ fontSize: '1.25rem', color: '#0284c7', fontWeight: 800 }}>
                  KES {loan.processingFee.toLocaleString()}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>FEE STATUS</span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: loan.feeStatus === 'Paid' ? '#047857' : '#b45309'
                }}>
                  {loan.feeStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>DATE APPLIED</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
                  {new Date(loan.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </strong>
              </div>
            </div>

            {/* Payment Prompt block */}
            {(loan.status === 'Pending_STK_Fee_Payment' || loan.feeStatus === 'Pending_STK_Push') && (
              <div style={{
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.5rem 0' }}>
                  Action Required: Complete Processing Fee Payment
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                  Your application is pre-approved for <strong>KES {loan.amount.toLocaleString()}</strong>.
                  To complete assessment and disburse funds, pay the processing fee of <strong>KES {loan.processingFee.toLocaleString()}</strong> via M-Pesa STK push.
                </p>

                <button
                  type="button"
                  className="btn-track-submit"
                  onClick={triggerPayment}
                  disabled={paymentLoading}
                  style={{ maxWidth: '280px' }}
                >
                  {paymentLoading ? 'Triggering prompt...' : '💳 Pay Processing Fee Now'}
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

            {/* Workflow Stages Timeline */}
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
                Application Process Timeline
              </h3>

              <div className="track-timeline" style={{ position: 'relative', paddingLeft: '2rem' }}>
                {/* Vertical line */}
                <div style={{
                  position: 'absolute',
                  left: '7px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  background: '#e2e8f0'
                }}></div>

                {stages.map((stage, idx) => {
                  const isCurrent = loan.status === stage.name;
                  const isCompleted = idx <= stages.findIndex(s => s.name === loan.status);

                  return (
                    <div key={stage.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                      {/* Circle indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '-2rem',
                        top: '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: isCurrent ? '#0284c7' : (isCompleted ? '#10b981' : '#cbd5e1'),
                        border: isCurrent ? '3px solid #bae6fd' : 'none',
                        boxSizing: 'border-box',
                        zIndex: 2
                      }}></div>

                      <div>
                        <strong style={{
                          fontSize: '0.925rem',
                          color: isCurrent ? '#0284c7' : (isCompleted ? '#0f172a' : '#94a3b8'),
                          fontWeight: 700
                        }}>
                          {stage.name.replace(/_/g, ' ')}
                        </strong>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="cust-footer" style={{ marginTop: 'auto', padding: '1.5rem', textAlign: 'center', background: '#ffffff', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
        &copy; 2026 Jijenge Loans. All Rights Reserved. All financial transactions are regulated by the Central Bank of Kenya.
      </footer>
    </div>
  );
};
