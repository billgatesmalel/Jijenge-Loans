import React from 'react';
import { ShieldCheck, Lock, UserCheck, Sparkles, PhoneCall } from 'lucide-react';
import { BRAND } from '../lib/shared';

interface NavbarProps {
  onOpenApply: () => void;
  onOpenCustomer: () => void;
  onOpenAdmin: () => void;
  onOpenSupport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenApply,
  onOpenCustomer,
  onOpenAdmin,
  onOpenSupport
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5 font-display">
              Jijenge<span className="text-emerald-400">Loans</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400/90 block -mt-1">
              CBK Licensed Lender
            </span>
          </div>
        </a>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#calculator" className="hover:text-emerald-400 transition-colors">Loan Calculator</a>
          <a href="#sectors" className="hover:text-emerald-400 transition-colors">Business Sectors</a>
          <a href="#compliance" className="hover:text-emerald-400 transition-colors">CBK Compliance</a>
          <button 
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            Live Support
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Customer Login</span>
          </button>

          <button
            onClick={onOpenAdmin}
            className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all"
            title="Admin Portal"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin</span>
          </button>

          <button
            onClick={onOpenApply}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply For Loan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
