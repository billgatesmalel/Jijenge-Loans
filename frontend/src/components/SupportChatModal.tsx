import React, { useState } from 'react';
import { X, Send, Bot } from 'lucide-react';
import { BRAND } from '../lib/shared';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'SUPPORT', text: `Welcome to ${BRAND.name} Support! How can we assist you with your loan application today?` }
  ]);
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'CUSTOMER', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'SUPPORT',
          text: `Thank you for reaching out. A loan officer is reviewing your inquiry. For urgent assistance, call ${BRAND.supportPhone}.`
        }
      ]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel p-6 rounded-3xl border-slate-800 shadow-2xl flex flex-col h-[520px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Live Customer Support</h3>
              <p className="text-[11px] text-emerald-400">Online • 24/7 Agent Available</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  m.sender === 'CUSTOMER'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
