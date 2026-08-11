import React, { useState, useEffect, useRef } from 'react';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const focusStyle: React.CSSProperties = {
  outline: 'none',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.9rem',
  borderRadius: '10px',
  border: '1.5px solid #cbd5e1',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  fontFamily: 'inherit',
};

/* Phone Normalization Helper for Kenyan M-Pesa Numbers */
const normalizeKenyanPhone = (raw: string): string | null => {
  const clean = raw.replace(/\D/g, '');
  if (clean.length === 10 && (clean.startsWith('07') || clean.startsWith('01'))) {
    return '254' + clean.slice(1);
  }
  if (clean.length === 12 && clean.startsWith('254')) {
    return clean;
  }
  if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
    return '254' + clean;
  }
  return null;
};

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose }) => {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [subject, setSubject] = useState('General Loan Inquiry');
  const [initialMsg, setInitialMsg] = useState('');

  // Inline Validation Errors
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; msg?: string }>({});

  // Active chat
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (firstInputRef.current) firstInputRef.current.focus();
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Load ticket from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('bl_chat_conversationId');
    const savedName = localStorage.getItem('bl_chat_guestName');
    const savedPhone = localStorage.getItem('bl_chat_guestPhone');

    if (savedId) setTicketId(savedId);
    if (savedName) setGuestName(savedName);
    if (savedPhone) setGuestPhone(savedPhone);
  }, []);

  // Poll messages if ticket is active and chat is open
  useEffect(() => {
    let intervalId: any;
    if (isOpen && ticketId) {
      syncMessages();
      intervalId = setInterval(() => {
        syncMessages();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, ticketId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const syncMessages = async () => {
    if (!ticketId) return;
    const phone = localStorage.getItem('bl_chat_guestPhone') || guestPhone;
    try {
      const res = await fetch(`/api/support/tickets?phone=${phone}`);
      const data = await res.json();
      if (res.ok && data.success && data.tickets) {
        const myTicket = data.tickets.find((t: any) => t.id === ticketId);
        if (myTicket && myTicket.messages) {
          setMessages(myTicket.messages);
        }
      }
    } catch (e) {
      console.warn('Failed to sync support messages:', e);
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string; email?: string; msg?: string } = {};

    if (!guestName.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const normalized = normalizeKenyanPhone(guestPhone);
    if (!guestPhone.trim() || !normalized) {
      newErrors.phone = 'Valid M-Pesa number required (e.g. 0712345678 or 254712345678).';
    }

    if (guestEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    if (!initialMsg.trim()) {
      newErrors.msg = 'Please enter an initial message describing your request.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent duplicate submissions

    if (!validateForm()) return;

    const normalizedPhone = normalizeKenyanPhone(guestPhone) || guestPhone.trim();

    setLoading(true);

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: normalizedPhone,
          customerName: guestName.trim(),
          customerEmail: guestEmail.trim() || undefined,
          subject,
          message: initialMsg.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.ticket) {
        localStorage.setItem('bl_chat_conversationId', data.ticket.id);
        localStorage.setItem('bl_chat_guestName', guestName.trim());
        localStorage.setItem('bl_chat_guestPhone', normalizedPhone);
        setTicketId(data.ticket.id);
        setMessages(data.ticket.messages || []);
      } else {
        alert(data.message || 'Failed to start conversation. Please try again.');
      }
    } catch (err) {
      alert('Connection failed. Please verify your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticketId) return;

    const textToSend = replyText.trim();
    setReplyText('');

    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'CUSTOMER',
          senderName: guestName,
          text: textToSend,
        }),
      });

      if (res.ok) {
        syncMessages();
      }
    } catch (err) {
      console.error('Failed to dispatch user chat message:', err);
    }
  };

  const handleResetChat = () => {
    localStorage.removeItem('bl_chat_conversationId');
    setTicketId(null);
    setMessages([]);
    setInitialMsg('');
    setErrors({});
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#FF6600';
    e.target.style.boxShadow = '0 0 0 3.5px rgba(255, 102, 0, 0.15)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#e2e8f0';
    e.target.style.boxShadow = 'none';
  };

  if (!isOpen) return null;

  return (
    /* ── Backdrop Overlay ── */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      {/* ── Modal Dialog Card ── */}
      <div
        ref={modalRef}
        className="support-modal-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: 'min(92vh, 580px)',
          borderRadius: '20px',
          background: '#ffffff',
          padding: '1.35rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.85rem',
            marginBottom: '1rem',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              id="support-modal-title"
              style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.15rem 0', fontFamily: 'inherit', letterSpacing: '-0.025em' }}
            >
              Live Customer Support
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
              Online · 24/7 Agent Available
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {ticketId && (
              <button
                type="button"
                onClick={handleResetChat}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                title="Reset Chat & Create New Ticket"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close live customer support modal"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
                (e.currentTarget as HTMLButtonElement).style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── GUEST SIGNUP FORM ── */}
        {!ticketId ? (
          <form
            onSubmit={handleStartConversation}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              paddingRight: '0.2rem',
            }}
          >
            {/* Grid for Name & Phone */}
            <div className="support-form-grid">
              <div>
                <label htmlFor="guest-name" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  ref={firstInputRef}
                  id="guest-name"
                  type="text"
                  placeholder="Your Name"
                  value={guestName}
                  onChange={(e) => { setGuestName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
                  style={{
                    ...inputBase,
                    ...focusStyle,
                    borderColor: errors.name ? '#ef4444' : '#e2e8f0',
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  required
                />
                {errors.name && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>{errors.name}</span>}
              </div>

              <div>
                <label htmlFor="guest-phone" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  M-Pesa Phone *
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => { setGuestPhone(e.target.value); if (errors.phone) setErrors(p => ({ ...p, phone: undefined })); }}
                  style={{
                    ...inputBase,
                    ...focusStyle,
                    borderColor: errors.phone ? '#ef4444' : '#e2e8f0',
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  required
                />
                {errors.phone && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>{errors.phone}</span>}
              </div>
            </div>

            <div>
              <label htmlFor="guest-email" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Email Address <span style={{ color: '#64748b', fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                id="guest-email"
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => { setGuestEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                style={{
                  ...inputBase,
                  ...focusStyle,
                  borderColor: errors.email ? '#ef4444' : '#e2e8f0',
                }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              {errors.email && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>{errors.email}</span>}
            </div>

            <div>
              <label htmlFor="guest-subject" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Inquiry Subject
              </label>
              <select
                id="guest-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ ...inputBase, ...focusStyle }}
                onFocus={onFocus as any}
                onBlur={onBlur as any}
              >
                <option value="General Loan Inquiry">General Loan Inquiry</option>
                <option value="STK Processing Payment Error">STK Processing Payment Error</option>
                <option value="Loan Repayment Questions">Loan Repayment Questions</option>
                <option value="Disbursal Status & Delays">Disbursal Status &amp; Delays</option>
                <option value="Other Service Support">Other Service Support</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '110px' }}>
              <label htmlFor="guest-msg" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Initial message *
              </label>
              <textarea
                id="guest-msg"
                placeholder="How can we help you today?"
                value={initialMsg}
                onChange={(e) => { setInitialMsg(e.target.value); if (errors.msg) setErrors(p => ({ ...p, msg: undefined })); }}
                style={{
                  ...inputBase,
                  ...focusStyle,
                  flex: 1,
                  resize: 'vertical',
                  minHeight: '95px',
                  maxHeight: '140px',
                  borderColor: errors.msg ? '#ef4444' : '#e2e8f0',
                }}
                onFocus={onFocus as any}
                onBlur={onBlur as any}
                required
              />
              {errors.msg && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>{errors.msg}</span>}
            </div>

            {/* ── Submit button: Primary Jijenge Orange CTA ── */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                background: loading ? '#E55C00' : '#FF6600',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 20px rgba(255, 102, 0, 0.28)',
                transition: 'background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
                fontFamily: 'inherit',
                minHeight: '48px',
                flexShrink: 0,
                marginTop: '0.25rem',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#E55C00';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(255, 102, 0, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#FF6600';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255, 102, 0, 0.28)';
                }
              }}
            >
              <span>{loading ? 'Starting Conversation...' : 'Start Conversation'}</span>
              {!loading && (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>
        ) : (
          /* ── CONVERSATION VIEW ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Messages timeline */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
              {messages.map((m) => {
                const isMe = m.sender === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? '#0f172a' : '#f1f5f9',
                      color: isMe ? '#ffffff' : '#0f172a',
                      padding: '0.6rem 0.95rem',
                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      maxWidth: '78%',
                      fontSize: '0.875rem',
                      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                    }}
                  >
                    <div>{m.text}</div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.7, float: 'right', marginTop: '0.2rem' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Reply form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Type your message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 0.95rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="submit"
                style={{
                  background: '#FF6600',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.1rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  transition: 'background 0.2s ease',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#E55C00'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FF6600'; }}
              >
                Send
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
