import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';

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
      const res = await apiFetch(`/api/support/tickets?phone=${phone}`);
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
      const res = await apiFetch('/api/support/ticket', {
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
      const res = await apiFetch(`/api/support/tickets/${ticketId}/message`, {
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

  if (!isOpen) return null;

  return (
    /* ── Backdrop Overlay ── */
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
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
        className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl max-w-[520px] w-full max-h-[min(92vh,580px)] flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 flex-shrink-0">
          <div>
            <h3 id="support-modal-title" className="text-lg font-black text-brand-navy tracking-tight m-0">
              Live Customer Support
            </h3>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online · 24/7 Agent Available
            </span>
          </div>

          <div className="flex items-center gap-2">
            {ticketId && (
              <button
                type="button"
                onClick={handleResetChat}
                className="btn-secondary px-3 py-1 text-xs"
                style={{ minHeight: '32px', borderRadius: '8px' }}
                title="Reset Chat & Create New Ticket"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close live customer support modal"
              className="text-slate-400 hover:text-slate-900 hover:bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── GUEST SIGNUP FORM ── */}
        {!ticketId ? (
          <form
            onSubmit={handleStartConversation}
            className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
          >
            {/* Grid for Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="guest-name" className="jijenge-label">
                  Full Name *
                </label>
                <input
                  ref={firstInputRef}
                  id="guest-name"
                  type="text"
                  placeholder="Your Name"
                  value={guestName}
                  onChange={(e) => { setGuestName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
                  className={`jijenge-input ${errors.name ? 'jijenge-input-error' : ''}`}
                  required
                />
                {errors.name && <span className="text-[11px] text-red-600 font-bold mt-1 block">{errors.name}</span>}
              </div>

              <div>
                <label htmlFor="guest-phone" className="jijenge-label">
                  M-Pesa Phone *
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => { setGuestPhone(e.target.value); if (errors.phone) setErrors(p => ({ ...p, phone: undefined })); }}
                  className={`jijenge-input ${errors.phone ? 'jijenge-input-error' : ''}`}
                  required
                />
                {errors.phone && <span className="text-[11px] text-red-600 font-bold mt-1 block">{errors.phone}</span>}
              </div>
            </div>

            <div>
              <label htmlFor="guest-email" className="jijenge-label">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="guest-email"
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => { setGuestEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                className={`jijenge-input ${errors.email ? 'jijenge-input-error' : ''}`}
              />
              {errors.email && <span className="text-[11px] text-red-600 font-bold mt-1 block">{errors.email}</span>}
            </div>

            <div>
              <label htmlFor="guest-subject" className="jijenge-label">
                Inquiry Subject
              </label>
              <select
                id="guest-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="jijenge-select"
              >
                <option value="General Loan Inquiry">General Loan Inquiry</option>
                <option value="STK Processing Payment Error">STK Processing Payment Error</option>
                <option value="Loan Repayment Questions">Loan Repayment Questions</option>
                <option value="Disbursal Status & Delays">Disbursal Status &amp; Delays</option>
                <option value="Other Service Support">Other Service Support</option>
              </select>
            </div>

            <div className="flex flex-col flex-1 min-h-[110px]">
              <label htmlFor="guest-msg" className="jijenge-label">
                Initial message *
              </label>
              <textarea
                id="guest-msg"
                placeholder="How can we help you today?"
                value={initialMsg}
                onChange={(e) => { setInitialMsg(e.target.value); if (errors.msg) setErrors(p => ({ ...p, msg: undefined })); }}
                className={`jijenge-textarea flex-1 min-h-[95px] max-h-[140px] ${errors.msg ? 'jijenge-input-error' : ''}`}
                required
              />
              {errors.msg && <span className="text-[11px] text-red-600 font-bold mt-1 block">{errors.msg}</span>}
            </div>

            {/* ── Submit button: Primary Jijenge Orange CTA ── */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1 flex-shrink-0"
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
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Messages timeline */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 mb-4">
              {messages.map((m) => {
                const isMe = m.sender === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    className={`max-w-[78%] p-3 rounded-2xl text-sm shadow-sm ${
                      isMe
                        ? 'bg-brand-navy text-white rounded-tr-none'
                        : 'bg-slate-100 text-brand-navy rounded-tl-none'
                    }`}
                    style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
                  >
                    <div>{m.text}</div>
                    <span className="text-[10px] opacity-70 float-right mt-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Reply form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 flex-shrink-0">
              <input
                type="text"
                placeholder="Type your message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="jijenge-input flex-1"
                style={{ height: '44px' }}
              />
              <button
                type="submit"
                className="btn-primary px-5 py-2 min-h-[44px] text-sm"
                style={{ borderRadius: '10px' }}
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
