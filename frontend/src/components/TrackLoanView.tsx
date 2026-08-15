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
    <div className="container max-w-[900px] pb-16">
      {/* Title Header */}
      <div className="section-title-wrap text-center">
        <span className="sub-tag">Real-Time Status</span>
        <h2 className="section-heading">Track Loan Application</h2>
        <p className="section-subheading">
          Check the real-time status of your credit assessment, payment approval, and M-Pesa disbursement.
        </p>
      </div>

      {/* Search Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-9 shadow-sm mx-auto mb-10 max-w-[820px]">
        <form onSubmit={handleSearch}>
          <div className="mb-5">
            <label htmlFor="track-query" className="jijenge-label">
              Enter National ID, M-Pesa Phone Number, or Application Reference (Ref)
            </label>
            <input
              type="text"
              id="track-query"
              placeholder="e.g. BL-XXXX-XXXX or 2547XXXXXXXX"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="jijenge-input"
              required
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 sm:flex-none"
            >
              <Search size={16} aria-hidden="true" />
              <span>{loading ? 'Searching...' : 'Check Status'}</span>
            </button>

            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary"
              >
                <X size={16} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="jijenge-alert jijenge-alert-error mt-5">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Search Result Card */}
      {loan && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-9 shadow-md max-w-[820px] mx-auto">
          {/* Header row */}
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <span className="jijenge-badge jijenge-badge-warning">
                Ref: {loan.transactionRef || 'N/A'}
              </span>
              <h3 className="text-xl font-extrabold text-brand-navy mt-3 mb-0">
                {loan.fullName || 'Valued Customer'}
              </h3>
            </div>

            <span className={`jijenge-badge jijenge-badge-${
              badgeConfig.text.toLowerCase().includes('disbursed') || badgeConfig.text.toLowerCase().includes('approved') || badgeConfig.text.toLowerCase().includes('paid')
                ? 'success'
                : badgeConfig.text.toLowerCase().includes('rejected') || badgeConfig.text.toLowerCase().includes('failed') || badgeConfig.text.toLowerCase().includes('cancel')
                  ? 'error'
                  : 'warning'
            } px-3 py-1.5`}>
              {badgeConfig.text}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
            <div>
              <span className="text-[11px] text-slate-500 font-bold tracking-wider uppercase block mb-1">
                Loan Amount Matched
              </span>
              <strong className="text-lg font-black text-brand-navy">
                KES {(loan.amount || 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold tracking-wider uppercase block mb-1">
                Processing Fee
              </span>
              <strong className="text-lg font-black text-sky-600">
                KES {(loan.processingFee || 0).toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold tracking-wider uppercase block mb-1">
                Fee Status
              </span>
              <span className={`text-sm font-black ${loan.feeStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {(loan.feeStatus || 'Pending').replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold tracking-wider uppercase block mb-1">
                Date Applied
              </span>
              <strong className="text-sm font-extrabold text-brand-navy">
                {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) : 'N/A'}
              </strong>
            </div>
          </div>

          {/* Fee Payment Prompt Block if unpaid */}
          {(loan.status === 'Pending_STK_Fee_Payment' || loan.feeStatus === 'Pending_STK_Push') && (
            <div className="jijenge-alert jijenge-alert-info flex-col p-6 mb-8">
              <h4 className="text-base font-extrabold text-sky-800 mb-2">
                Action Required: Complete Processing Fee Payment
              </h4>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Your application is pre-approved for <strong>KES {(loan.amount || 0).toLocaleString()}</strong>. To complete assessment and disburse funds, pay the processing fee of <strong>KES {(loan.processingFee || 0).toLocaleString()}</strong> via M-Pesa STK push.
              </p>

              <button
                type="button"
                onClick={triggerPayment}
                disabled={paymentLoading}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm"
              >
                <CreditCard size={16} aria-hidden="true" />
                <span>{paymentLoading ? 'Triggering prompt...' : 'Pay Processing Fee Now'}</span>
              </button>

              {paymentMessage && (
                <p className="mt-3 text-sm font-bold text-emerald-600">
                  {paymentMessage}
                </p>
              )}
              {paymentError && (
                <p className="mt-3 text-sm font-bold text-red-600">
                  {paymentError}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          {Array.isArray(stages) && stages.length > 0 && (
            <div>
              <h4 className="text-base font-black text-brand-navy mb-5">
                Application Process Timeline
              </h4>

              <div className="relative pl-8">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-100" />

                {stages.map((stage, idx) => {
                  const stageName = stage?.name || '';
                  const loanStatus = loan?.status || '';
                  const isCurrent = loanStatus === stageName;
                  const completedIdx = stages.findIndex((s) => s?.name === loanStatus);
                  const isCompleted = completedIdx !== -1 && idx <= completedIdx;

                  return (
                    <div key={stage?.id || idx} className="relative mb-6 last:mb-0">
                      <div
                        className={`absolute -left-8 top-1.5 w-4 h-4 rounded-full z-10 ${
                          isCurrent
                            ? 'bg-[#FF6600] border-4 border-[#FFF0E5]'
                            : isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                        }`}
                      />

                      <div>
                        <strong
                          className={`text-sm ${
                            isCurrent
                              ? 'text-[#FF6600]'
                              : isCompleted
                                ? 'text-brand-navy'
                                : 'text-slate-400'
                          } font-bold`}
                        >
                          {stageName.replace(/_/g, ' ')}
                        </strong>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
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

