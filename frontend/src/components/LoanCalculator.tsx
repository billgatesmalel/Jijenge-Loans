import React, { useState } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import { formatKSh, calculateProcessingFee } from '../lib/shared';

interface LoanCalculatorProps {
  onSelectPackage: (packageName: string, amount: number) => void;
}

const PACKAGES = [
  { name: 'Jijenge Micro Booster', min: 5000, max: 25000, default: 15000, tenure: '30 Days', rate: '5%' },
  { name: 'Jijenge Business Flex', min: 25000, max: 50000, default: 35000, tenure: '30 Days', rate: '4.5%' },
  { name: 'Jijenge Trade Prime', min: 50000, max: 100000, default: 75000, tenure: '60 Days', rate: '4%' },
  { name: 'Jijenge Enterprise Express', min: 100000, max: 200000, default: 150000, tenure: '90 Days', rate: '3.5%' }
];

export const LoanCalculator: React.FC<LoanCalculatorProps> = ({ onSelectPackage }) => {
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[0]);
  const [loanAmount, setLoanAmount] = useState(selectedPkg.default);

  const processingFee = calculateProcessingFee(loanAmount);

  const handlePackageChange = (pkg: typeof PACKAGES[0]) => {
    setSelectedPkg(pkg);
    setLoanAmount(pkg.default);
  };

  return (
    <section id="calculator" className="py-16 bg-slate-900/60 border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Calculator className="w-4 h-4" />
            <span>Interactive Loan Calculator</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mt-3 font-display">
            Transparent Pricing. Instant Qualification.
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Select your preferred loan package and slide to customize your required funding limit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Choose Funding Package
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.name}
                  onClick={() => handlePackageChange(pkg)}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    selectedPkg.name === pkg.name
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm font-bold text-white mb-1">{pkg.name}</div>
                  <div className="text-xs text-emerald-400 font-semibold mb-2">
                    {formatKSh(pkg.min)} - {formatKSh(pkg.max)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Tenure: {pkg.tenure}</span>
                    <span>Interest: {pkg.rate}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 glass-panel p-6 sm:p-8 rounded-3xl border-slate-800">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-300">Selected Amount</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-display">
                    {formatKSh(loanAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min={selectedPkg.min}
                  max={selectedPkg.max}
                  step={1000}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                  <span>{formatKSh(selectedPkg.min)}</span>
                  <span>{formatKSh(selectedPkg.max)}</span>
                </div>
              </div>

              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Loan Principal:</span>
                  <span className="font-semibold text-slate-200">{formatKSh(loanAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>App Processing Fee (STK Push):</span>
                  <span className="font-semibold text-emerald-400">{formatKSh(processingFee)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Repayment Tenure:</span>
                  <span className="font-semibold text-slate-200">{selectedPkg.tenure}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>M-Pesa Disbursal Amount:</span>
                  <span className="text-emerald-400">{formatKSh(loanAmount)}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectPackage(selectedPkg.name, loanAmount)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed with {selectedPkg.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
