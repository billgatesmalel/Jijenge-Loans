import React from 'react';
import { ShieldCheck, PhoneCall, Mail, MapPin } from 'lucide-react';
import { BRAND } from '../lib/shared';

export const Footer: React.FC = () => {
  return (
    <footer id="compliance" className="bg-slate-950 border-t border-slate-900 pt-16 pb-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg text-white font-display">Jijenge<span className="text-emerald-400">Loans</span></span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {BRAND.legalName} is a licensed non-deposit-taking microfinance credit provider regulated under Central Bank of Kenya (CBK) guidelines.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Quick Navigation</h4>
          <ul className="space-y-2">
            <li><a href="#calculator" className="hover:text-emerald-400 transition-colors">Loan Calculator</a></li>
            <li><a href="#sectors" className="hover:text-emerald-400 transition-colors">Business Sectors</a></li>
            <li><a href="#compliance" className="hover:text-emerald-400 transition-colors">Regulatory Compliance</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Contact Support</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2"><PhoneCall className="w-3.5 h-3.5 text-emerald-400" /><span>{BRAND.supportPhone}</span></li>
            <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-400" /><span>{BRAND.supportEmail}</span></li>
            <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-400" /><span>Nairobi, Kenya</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">CBK & Data Compliance</h4>
          <p className="text-slate-500 leading-relaxed mb-3">
            Fully compliant with the Office of the Data Protection Commissioner (ODPC) Act 2019 Kenya. All transactions secured via 256-bit SSL encryption.
          </p>
          <span className="px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-emerald-400 text-[10px] font-mono">
            ODPC Certified • CBK Registered
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 border-t border-slate-900 pt-6 text-center text-slate-600">
        © {new Date().getFullYear()} {BRAND.legalName}. All Rights Reserved.
      </div>
    </footer>
  );
};
