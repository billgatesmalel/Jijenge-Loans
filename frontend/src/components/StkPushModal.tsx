import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

interface StkPushModalProps {
  isOpen: boolean;
  phoneNumber: string;
  amount: number;
  transactionRef?: string;
  loading?: boolean;
  error?: string;
  successReceipt?: string;
  onSuccess?: (receipt: string) => void;
  onRetry: () => void;
  onClose: () => void;
}

export const StkPushModal: React.FC<StkPushModalProps> = ({
  isOpen,
  phoneNumber,
  amount,
  transactionRef,
  loading = false,
  error,
  successReceipt,
  onSuccess,
  onRetry,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [showPaybillHelp, setShowPaybillHelp] = useState(false);
  const [localReceipt, setLocalReceipt] = useState<string | null>(successReceipt || null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [gatewayName, setGatewayName] = useState<string>('');

  // Reset or initialize modal state upon opening
  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(60);
      setShowPaybillHelp(false);
      setLocalReceipt(null);
      setLocalError(null);
      setIsSuccess(false);
      setGatewayName('');
      return;
    }

    setSecondsLeft(60);
    setLocalReceipt(successReceipt || null);
    setLocalError(null);
    setIsSuccess(!!successReceipt);

    // 60-second visual countdown
    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isOpen, successReceipt]);

  // Handle timeout condition
  useEffect(() => {
    if (secondsLeft === 0 && !isSuccess && !loading) {
      setLocalError('Request timed out or cancelled on device');
    }
  }, [secondsLeft, isSuccess, loading]);

  // 3-second active polling of /api/payments/status/:reference
  useEffect(() => {
    if (!isOpen || !transactionRef || isSuccess) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/payments/status/${encodeURIComponent(transactionRef)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.feeStatus === 'Paid' || data.status === 'Application_Received' || data.mpesaReceipt) {
            clearInterval(pollInterval);
            setIsSuccess(true);
            const receipt = data.mpesaReceipt || `MP${Date.now().toString().slice(-8)}`;
            setLocalReceipt(receipt);
            if (data.gatewayProvider) setGatewayName(data.gatewayProvider);
            if (onSuccess) {
              setTimeout(() => {
                onSuccess(receipt);
              }, 2000);
            }
          } else if (
            data.feeStatus === 'Failed' ||
            data.feeStatus === 'Cancelled' ||
            data.status === 'Payment_Failed' ||
            data.feeStatus === 'Expired' ||
            data.status === 'Payment_Timed_Out'
          ) {
            setLocalError('Request timed out or cancelled on device');
          }
        }
      } catch (err) {
        console.debug('Payment status polling error:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isOpen, transactionRef, isSuccess, onSuccess]);

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'stkFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          padding: '1.75rem 1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          animation: 'stkScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: isSuccess
              ? 'linear-gradient(90deg, #10B981, #059669)'
              : displayError
              ? 'linear-gradient(90deg, #EF4444, #DC2626)'
              : 'linear-gradient(90deg, #10B981, #22C55E, #059669)',
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B',
            fontSize: '1rem',
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E2E8F0';
            e.currentTarget.style.color = '#0F172A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F1F5F9';
            e.currentTarget.style.color = '#64748B';
          }}
        >
          ✕
        </button>

        {/* ── SUCCESS STATE VIEW ── */}
        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem' }}>
            {/* Green Checkmark Circle */}
            <div
              style={{
                width: '84px',
                height: '84px',
                margin: '0 auto 1.25rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 30px -6px rgba(16, 185, 129, 0.45)',
                animation: 'stkScaleUp 0.4s ease-out forwards',
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ECFDF5',
                color: '#047857',
                border: '1px solid #A7F3D0',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
              }}
            >
              ✓ M-Pesa Payment Confirmed
            </span>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', margin: '0 0 0.5rem' }}>
              Fee Payment Successful!
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 1.25rem' }}>
              Your verification fee of <strong style={{ color: '#047857' }}>KES {amount.toLocaleString()}</strong> has been verified.
            </p>

            {/* Receipt Box */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '16px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                M-Pesa Receipt Code
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803D', letterSpacing: '0.05em' }}>
                {localReceipt || 'MPESA-CONFIRMED'}
              </div>
              {gatewayName && (
                <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '0.35rem' }}>
                  Processed via {gatewayName === 'GRAVITYPAY' ? 'GravityPay' : 'Palplus'} Gateway
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSuccess && localReceipt) onSuccess(localReceipt);
                else onClose();
              }}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              Continue with Application →
            </button>
          </div>
        ) : (
          /* ── INITIATION & COUNTDOWN VIEW ── */
          <>
            {/* Visual Header / Radar Animation */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Pulsing ring 1 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-10px',
                    borderRadius: '50%',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    animation: 'stkPulseRing 2s infinite cubic-bezier(0.4, 0, 0.6, 1)',
                  }}
                />
                {/* Pulsing ring 2 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-20px',
                    borderRadius: '50%',
                    border: '2px solid rgba(16, 185, 129, 0.2)',
                    animation: 'stkPulseRing 2s infinite cubic-bezier(0.4, 0, 0.6, 1) 0.5s',
                  }}
                />

                {/* Main Phone Icon Container */}
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                    fontSize: '2.25rem',
                    zIndex: 2,
                    animation: 'stkPhoneVibrate 1.5s infinite ease-in-out',
                  }}
                >
                  📱
                </div>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.65rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 8px #10B981',
                    animation: 'stkBlink 1s infinite',
                  }}
                />
                M-Pesa STK Prompt Triggered
              </span>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
                Check Your Phone for PIN Prompt
              </h2>

              <p
                style={{
                  fontSize: '0.925rem',
                  color: '#334155',
                  marginTop: '0.6rem',
                  marginBottom: 0,
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                An STK push prompt has been dispatched to <strong style={{ color: '#0F172A', fontWeight: 800 }}>{phoneNumber}</strong>. Please enter your secret M-Pesa PIN to authorize <strong style={{ color: '#047857', fontWeight: 800 }}>KES {amount.toLocaleString()}</strong>.
              </p>
            </div>

            {/* Live 60-Second Countdown Status Bar */}
            <div
              style={{
                background: loading ? '#FFF7ED' : displayError ? '#FEF2F2' : '#F8FAFC',
                border: `1.5px solid ${loading ? '#FFEDD5' : displayError ? '#FCA5A5' : '#E2E8F0'}`,
                borderRadius: '16px',
                padding: '0.9rem 1.1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {loading ? (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid #F97316',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'stkSpin 0.8s linear infinite',
                    }}
                  />
                ) : displayError ? (
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>⏳</span>
                )}
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.825rem',
                      fontWeight: 800,
                      color: loading ? '#C2410C' : displayError ? '#991B1B' : '#0F172A',
                    }}
                  >
                    {loading
                      ? 'Dispatching STK Push Prompt...'
                      : displayError
                      ? 'STK Push Pending or Timed Out'
                      : 'Waiting for M-Pesa PIN Confirmation...'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {secondsLeft > 0
                      ? `Auto-checking payment status (${secondsLeft}s remaining)`
                      : 'Awaiting callback response from Safaricom...'}
                  </span>
                </div>
              </div>

              <span
                style={{
                  background: displayError ? '#FEE2E2' : '#E2E8F0',
                  color: displayError ? '#991B1B' : '#475569',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
              </span>
            </div>

            {/* Clear Reason Display Above the Button (Requirement 5) */}
            {displayError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.4,
                  animation: 'stkFadeIn 0.2s ease-in-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span>⚠️</span>
                  <span>Notice:</span>
                </div>
                <div>{displayError}</div>
              </div>
            )}

            {/* Quick Action Steps Card */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '16px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#166534',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.65rem',
                }}
              >
                📋 Quick Steps to Finalize:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      borderRadius: '50%',
                      minWidth: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      marginTop: '1px',
                    }}
                  >
                    1
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#166534', lineHeight: 1.4 }}>
                    Unlock your mobile phone screen to view the <strong>M-Pesa USSD prompt</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      borderRadius: '50%',
                      minWidth: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      marginTop: '1px',
                    }}
                  >
                    2
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#166534', lineHeight: 1.4 }}>
                    Enter your secret <strong>M-Pesa PIN</strong> to authorize KES {amount.toLocaleString()}.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      borderRadius: '50%',
                      minWidth: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      marginTop: '1px',
                    }}
                  >
                    3
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#166534', lineHeight: 1.4 }}>
                    Stay on this window! Callback is auto-detected within 3 seconds.
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Paybill Instructions */}
            {showPaybillHelp && (
              <div
                style={{
                  background: '#EFF6FF',
                  border: '1.5px solid #93C5FD',
                  borderRadius: '16px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  animation: 'stkFadeIn 0.2s ease-in-out',
                }}
              >
                <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1E40AF', marginBottom: '0.5rem' }}>
                  💳 Manual Paybill Payment Option
                </div>
                <p style={{ fontSize: '0.78rem', color: '#1E3A8A', margin: '0 0 0.65rem', lineHeight: 1.4 }}>
                  If you didn't receive the prompt, open M-Pesa on your phone and complete payment via Paybill:
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.78rem',
                    background: '#FFFFFF',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Paybill Business No:</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: 900 }}>400200</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Account Number:</span>
                    <strong style={{ color: '#FF6600', fontSize: '0.85rem', fontWeight: 800 }}>
                      {transactionRef || phoneNumber}
                    </strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Amount:</span>
                    <strong style={{ color: '#15803D', fontSize: '0.9rem', fontWeight: 900 }}>
                      KES {amount.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Action Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setSecondsLeft(60);
                  onRetry();
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: 'linear-gradient(135deg, #FF6600 0%, #E55C00 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '0.925rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 102, 0, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2.5px solid #FFFFFF',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'stkSpin 0.8s linear infinite',
                      }}
                    />
                    <span>Dispatching STK Push Prompt...</span>
                  </>
                ) : displayError || secondsLeft === 0 ? (
                  <>
                    <span>🔄 Retry STK Push</span>
                  </>
                ) : (
                  <>
                    <span>🔄 Resend STK Push Prompt</span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPaybillHelp(!showPaybillHelp)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.5rem',
                    background: showPaybillHelp ? '#DBEAFE' : '#F8FAFC',
                    color: '#1E40AF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {showPaybillHelp ? 'Hide Paybill Info' : "💬 Didn't get prompt?"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.5rem',
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close Window
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StkPushModal;
