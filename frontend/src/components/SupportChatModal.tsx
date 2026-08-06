import React, { useState, useEffect, useRef } from 'react';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose }) => {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [subject, setSubject] = useState('General Loan Inquiry');
  const [initialMsg, setInitialMsg] = useState('');

  // Active chat
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim() || !initialMsg.trim()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: guestPhone.trim(),
          customerName: guestName.trim(),
          subject,
          message: initialMsg.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.ticket) {
        localStorage.setItem('bl_chat_conversationId', data.ticket.id);
        localStorage.setItem('bl_chat_guestName', guestName.trim());
        localStorage.setItem('bl_chat_guestPhone', guestPhone.trim());
        setTicketId(data.ticket.id);
        setMessages(data.ticket.messages || []);
      } else {
        alert(data.message || 'Failed to start conversation. Please try again.');
      }
    } catch (err) {
      alert('Connection failed. Please verify your internet network.');
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
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ display: 'flex', zIndex: 99999 }}>
      <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%', borderRadius: '24px', background: '#ffffff', padding: '2rem', display: 'flex', flexDirection: 'column', height: '560px', border: '1.5px solid #cbd5e1', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.15rem 0' }}>Live Customer Support</h3>
            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>Online • 24/7 Agent Available</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ticketId && (
              <button
                onClick={handleResetChat}
                style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer' }}
                title="Reset Chat & Create New Ticket"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* GUEST SIGNUP FORM */}
        {!ticketId ? (
          <form onSubmit={handleStartConversation} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>M-Pesa Phone *</label>
                <input
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Email Address (Optional)</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Inquiry Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              >
                <option value="General Loan Inquiry">General Loan Inquiry</option>
                <option value="STK Processing Payment Error">STK Processing Payment Error</option>
                <option value="Loan Repayment Questions">Loan Repayment Questions</option>
                <option value="Disbursal Status & Delays">Disbursal Status & Delays</option>
                <option value="Other Service Support">Other Service Support</option>
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Initial message *</label>
              <textarea
                placeholder="How can we help you today?"
                value={initialMsg}
                onChange={(e) => setInitialMsg(e.target.value)}
                style={{ width: '100%', flex: 1, padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', resize: 'none', boxSizing: 'border-box', minHeight: '80px' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer' }}
            >
              {loading ? 'Starting conversation...' : 'Start Conversation &rarr;'}
            </button>
          </form>
        ) : (
          /* CONVERSATION VIEW */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages timeline */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
              {messages.map((m) => {
                const isMe = m.sender === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? '#0284c7' : '#f1f5f9',
                      color: isMe ? '#ffffff' : '#0f172a',
                      padding: '0.55rem 0.9rem',
                      borderRadius: '12px',
                      maxWidth: '75%',
                      fontSize: '0.85rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>{m.text}</div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.7, float: 'right', marginTop: '0.15rem' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Submit reply form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Type your support reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 0.95rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.65rem 1rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
