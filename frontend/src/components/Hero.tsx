import React from 'react';
import { ShieldCheck, Zap, ArrowRight, Building2, TrendingUp, Users } from 'lucide-react';
import { formatKSh } from '../lib/shared';

interface HeroProps {
  onOpenApply: () => void;
  onOpenCustomer: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenApply, onOpenCustomer }) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide shadow-inner">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Licensed Non-Deposit Taking Microfinance Lender by CBK</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Supercharge Your Business Growth with{' '}
            <span className="emerald-gradient-text">Jijenge Loans</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Fast, non-collateral working capital loans up to <strong className="text-white font-semibold">{formatKSh(150000)}</strong> for Kenyan SMEs, traders, and entrepreneurs. Approved in under 5 minutes with instant M-Pesa disbursement.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onOpenApply}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <span>Apply For Business Loan</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenCustomer}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-panel text-white font-semibold text-base hover:bg-slate-900 border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Track Loan Application</span>
            </button>
          </div>

          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="glass-panel p-4 rounded-2xl border-slate-800/80">
              <Zap className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-sm font-bold text-white">Instant STK Fee</div>
              <div className="text-xs text-slate-400">Automated M-Pesa processing</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-slate-800/80">
              <TrendingUp className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-sm font-bold text-white">No Guarantors</div>
              <div className="text-xs text-slate-400">No physical collateral required</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-slate-800/80">
              <Building2 className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-sm font-bold text-white">6 Business Sectors</div>
              <div className="text-xs text-slate-400">Tailored package matching</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-slate-800/80">
              <Users className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-sm font-bold text-white">25,000+ Clients</div>
              <div className="text-xs text-slate-400">Empowered across Kenya</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
