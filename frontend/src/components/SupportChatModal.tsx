import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, RefreshCw, CheckCheck, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  directToken?: string | null;
}

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

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose, directToken }) => {
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

  // Handle direct token or load ticket from localStorage
  useEffect(() => {
    const activeId = directToken || localStorage.getItem('bl_chat_conversationId');
    const savedName = localStorage.getItem('bl_chat_guestName');
    const savedPhone = localStorage.getItem('bl_chat_guestPhone');

    if (activeId) {
      setTicketId(activeId);
      localStorage.setItem('bl_chat_conversationId', activeId);
    }
    if (savedName) setGuestName(savedName);
    if (savedPhone) setGuestPhone(savedPhone);
  }, [directToken]);

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
    try {
      // First try fetching directly by ticket ID
      let res = await apiFetch(`/api/support/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.ticket) {
          setMessages(data.ticket.messages || []);
          if (data.ticket.customerName && !guestName) setGuestName(data.ticket.customerName);
          if (data.ticket.customerPhone && !guestPhone) setGuestPhone(data.ticket.customerPhone);
          return;
        }
      }

      // Fallback: list tickets by phone
      const phone = localStorage.getItem('bl_chat_guestPhone') || guestPhone;
      if (phone) {
        res = await apiFetch(`/api/support/tickets?phone=${phone}`);
        const data = await res.json();
        if (res.ok && data.success && data.tickets) {
          const myTicket = data.tickets.find((t: any) => t.id === ticketId);
          if (myTicket && myTicket.messages) {
            setMessages(myTicket.messages);
          }
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
    if (loading) return;

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
          senderName: guestName || 'Customer',
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
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center sm:justify-end z-[99999] p-0 sm:p-4 transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-whatsapp-title"
    >
      {/* ── WhatsApp Styled Container Drawer Card ── */}
      <div
        className="bg-white w-full sm:w-[420px] h-full sm:h-[620px] sm:max-h-[92vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        style={{ fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif' }}
      >
        {/* ── WhatsApp Header Banner ── */}
        <div
          style={{ background: 'linear-gradient(135deg, #075e54, #128c7e)' }}
          className="p-3 text-white flex items-center justify-between shadow-md flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-white shadow-inner">
                <ShieldCheck size={22} className="text-emerald-200" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-emerald-800 rounded-full" />
            </div>

            <div>
              <h3 id="support-whatsapp-title" className="text-base font-bold m-0 leading-tight flex items-center gap-1.5">
                Jijenge Customer Care
              </h3>
              <span className="text-[11px] text-emerald-200 font-medium tracking-wide">
                Online • Official Support Chat
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {ticketId && (
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 hover:bg-white/15 text-white/90 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1"
                title="New Chat Session"
              >
                <RefreshCw size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close WhatsApp chat drawer"
              className="p-1.5 hover:bg-white/15 text-white/90 hover:text-white rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── GUEST REGISTRATION / INQUIRY FORM ── */}
        {!ticketId ? (
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50 flex flex-col justify-between">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-2 text-emerald-700 font-semibold text-sm">
                <MessageCircle size={18} />
                <span>Start WhatsApp Live Chat</span>
              </div>
              <p className="text-xs text-slate-600 m-0 leading-relaxed">
                Connect directly with our loan support specialists. Please verify your contact information to begin.
              </p>
            </div>

            <form onSubmit={handleStartConversation} className="flex-1 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  placeholder="e.g. Mary Wanjiku"
                  value={guestName}
                  onChange={(e) => { setGuestName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  required
                />
                {errors.name && <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.name}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  M-Pesa Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => { setGuestPhone(e.target.value); if (errors.phone) setErrors(p => ({ ...p, phone: undefined })); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  required
                />
                {errors.phone && <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.phone}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inquiry Topic
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                >
                  <option value="General Loan Inquiry">General Loan Inquiry</option>
                  <option value="STK Processing Payment Error">STK Processing Payment Error</option>
                  <option value="Loan Repayment Questions">Loan Repayment Questions</option>
                  <option value="Disbursal Status & Delays">Disbursal Status &amp; Delays</option>
                  <option value="Withdrawal Issues">Withdrawal Issues</option>
                  <option value="Other Service Support">Other Service Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message *
                </label>
                <textarea
                  placeholder="Describe how we can assist you..."
                  value={initialMsg}
                  onChange={(e) => { setInitialMsg(e.target.value); if (errors.msg) setErrors(p => ({ ...p, msg: undefined })); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none min-h-[85px] max-h-[120px]"
                  required
                />
                {errors.msg && <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.msg}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #25D366, #128c7e)' }}
                className="w-full py-2.5 px-4 text-white font-bold rounded-xl shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-auto"
              >
                <span>{loading ? 'Starting Chat...' : 'Start WhatsApp Chat'}</span>
                <Send size={16} />
              </button>
            </form>
          </div>
        ) : (
          /* ── WHATSAPP CONVERSATION THREAD ── */
          <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
            {/* Ambient WhatsApp Pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{ backgroundImage: `radial-gradient(#075e54 1px, transparent 0)`, backgroundSize: '16px 16px' }}
            />

            {/* Chat Timeline */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 z-10">
              <div className="self-center my-1 bg-white/90 text-[11px] text-slate-600 font-medium px-3 py-1 rounded-lg shadow-sm border border-slate-200/60">
                🔒 End-to-end encrypted official Jijenge Support chat
              </div>

              {messages.length === 0 ? (
                <div className="text-center text-xs text-slate-500 my-8">
                  Connecting to agent...
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender === 'CUSTOMER';
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[82%] p-2.5 rounded-lg text-xs leading-relaxed shadow-sm relative ${
                        isMe
                          ? 'bg-[#dcf8c6] text-[#111b21] rounded-tr-none self-end border border-[#c4ebad]'
                          : 'bg-white text-[#111b21] rounded-tl-none self-start border border-slate-200'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[10px] font-bold text-[#075e54] mb-0.5 flex items-center gap-1">
                          <span>{m.senderName || 'Jijenge Support'}</span>
                          <ShieldCheck size={11} className="text-emerald-600 inline" />
                        </div>
                      )}
                      <div className="break-words whitespace-pre-wrap">{m.text}</div>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck size={13} className="text-blue-500 inline" />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* WhatsApp Bottom Reply Bar */}
            <form
              onSubmit={handleSendMessage}
              className="bg-[#f0f2f5] p-2.5 border-t border-slate-200 flex items-center gap-2 z-10 flex-shrink-0"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-white border border-slate-300 text-xs px-3.5 py-2.5 rounded-full outline-none focus:border-[#128c7e] transition-colors"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                style={{ background: replyText.trim() ? '#128c7e' : '#cbd5e1' }}
                className="w-9 h-9 rounded-full text-white flex items-center justify-center transition-transform active:scale-95 flex-shrink-0 shadow-sm"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
