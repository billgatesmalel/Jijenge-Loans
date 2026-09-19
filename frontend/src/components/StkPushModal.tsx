import React, { useState, useEffect } from 'react';

interface StkPushModalProps {
  isOpen: boolean;
  phoneNumber: string;
  amount: number;
  transactionRef?: string;
  loading?: boolean;
  error?: string;
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
  onRetry,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [showPaybillHelp, setShowPaybillHelp] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(60);
      setShowPaybillHelp(false);
      return;
    }

    setSecondsLeft(60);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

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
        if (e.target === e.currentTarget) onClose();
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
            background: 'linear-gradient(90deg, #10B981, #22C55E, #059669)',
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

        {/* Visual Header / M-Pesa Radar Animation */}
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
            M-Pesa STK Push Sent
          </span>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
            STK Push Prompt Triggered
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
            STK push has been sent to your phone <strong style={{ color: '#0F172A', fontWeight: 800 }}>{phoneNumber}</strong>. Please enter your M-Pesa secret PIN to authorize <strong style={{ color: '#047857', fontWeight: 800 }}>KES {amount.toLocaleString()}</strong>.
          </p>
        </div>

        {/* Live Status Callback Bar */}
        <div
          style={{
            background: loading ? '#FFF7ED' : error ? '#FEF2F2' : '#F8FAFC',
            border: `1.5px solid ${loading ? '#FFEDD5' : error ? '#FCA5A5' : '#E2E8F0'}`,
            borderRadius: '16px',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.25rem',
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
            ) : error ? (
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
                  color: loading ? '#C2410C' : error ? '#991B1B' : '#0F172A',
                }}
              >
                {loading
                  ? 'Re-initiating STK Push Prompt...'
                  : error
                  ? 'PIN Entry Failed or Timed Out'
                  : 'Waiting for M-Pesa PIN Confirmation...'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {error ? error : secondsLeft > 0 ? `Auto-refreshing status (${secondsLeft}s)` : 'Awaiting callback response...'}
              </span>
            </div>
          </div>

          <span
            style={{
              background: error ? '#FEE2E2' : '#E2E8F0',
              color: error ? '#991B1B' : '#475569',
              padding: '0.25rem 0.6rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
          </span>
        </div>

        {/* Step-by-Step PIN Instructions Card */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: '16px',
            padding: '1.1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
            }}
          >
            📋 Quick Action Steps:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div
                style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  borderRadius: '50%',
                  minWidth: '24px',
                  height: '24px',
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
              <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.4 }}>
                Check your mobile phone screen for the <strong>M-Pesa USSD pop-up prompt</strong>.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div
                style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  borderRadius: '50%',
                  minWidth: '24px',
                  height: '24px',
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
              <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.4 }}>
                Enter your secret <strong>4-digit M-Pesa PIN</strong> to authorize KES {amount.toLocaleString()}.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div
                style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  borderRadius: '50%',
                  minWidth: '24px',
                  height: '24px',
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
              <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.4 }}>
                Stay on this window! System auto-detects callback &amp; initiates instant disbursal.
              </div>
            </div>
          </div>
        </div>

        {/* Manual Paybill Instructions Option */}
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
            onClick={onRetry}
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
                <span>Sending M-Pesa STK Prompt...</span>
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
              {showPaybillHelp ? 'Hide Paybill Info' : '💬 Didn\'t get prompt?'}
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
      </div>
    </div>
  );
};

export default StkPushModal;
