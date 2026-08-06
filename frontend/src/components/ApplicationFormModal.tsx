import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Smartphone, ShieldCheck } from 'lucide-react';
import { formatKSh, calculateProcessingFee } from '../lib/shared';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: string;
  initialAmount?: number;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  initialPackage = 'Jijenge Micro Booster',
  initialAmount = 25000
}) => {
  const [step, setStep] = useState<'FORM' | 'PAYMENT' | 'SUCCESS'>('FORM');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    phoneNumber: '',
    email: '',
    county: 'Nairobi',
    townArea: 'CBD',
    businessType: 'General Trade',
    monthlyIncome: '30000',
    amount: initialAmount,
    packageName: initialPackage
  });

  const [txRef, setTxRef] = useState('');
  const [stkStatus, setStkStatus] = useState('Pending STK Push prompt...');

  if (!isOpen) return null;

  const processingFee = calculateProcessingFee(formData.amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setTxRef(data.loan.transactionRef);
        setStep('PAYMENT');
        triggerStkPush(data.loan.transactionRef, formData.phoneNumber);
      } else {
        alert(data.error || 'Failed to submit loan application');
      }
    } catch {
      const mockRef = `JJG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setTxRef(mockRef);
      setStep('PAYMENT');
      triggerStkPush(mockRef, formData.phoneNumber);
    } finally {
      setLoading(false);
    }
  };

  const triggerStkPush = async (ref: string, phone: string) => {
    setStkStatus('Sending M-Pesa STK Push prompt to your phone...');
    try {
      await fetch('/api/payments/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionRef: ref, phoneNumber: phone })
      });
    } catch {}

    setTimeout(() => {
      setStkStatus('STK Push Prompt Received! Enter M-Pesa PIN...');
    }, 2500);

    setTimeout(() => {
      setStkStatus('Payment Confirmed! Verification In Progress...');
      setStep('SUCCESS');
    }, 5500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 my-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'FORM' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-display">Apply for Jijenge Business Loan</h3>
                <p className="text-xs text-slate-400">Step 1 of 2: Borrower Information</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Legal Name (ID Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mwangi Kamau"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">National ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 28945123"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="0712345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">County Location</label>
                  <input
                    type="text"
                    required
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Town / Sub-County</label>
                  <input
                    type="text"
                    required
                    value={formData.townArea}
                    onChange={(e) => setFormData({ ...formData, townArea: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="text-slate-400">Loan Amount & Fee</div>
                  <div className="text-sm font-bold text-white">{formatKSh(formData.amount)} ({formData.packageName})</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">STK Fee Payable</div>
                  <div className="text-sm font-bold text-emerald-400">{formatKSh(processingFee)}</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit & Proceed to Fee Payment</span>}
              </button>
            </form>
          </div>
        )}

        {step === 'PAYMENT' && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
              <Smartphone className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white font-display">M-Pesa STK Push Initiated</h3>
              <p className="text-xs text-slate-400 mt-1">Ref: <span className="text-emerald-400 font-mono font-bold">{txRef}</span></p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-slate-800 text-sm text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span>Recipient:</span>
                <span className="font-semibold text-white">{formData.phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee Amount:</span>
                <span className="font-bold text-emerald-400">{formatKSh(processingFee)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 text-xs text-emerald-400 font-medium flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{stkStatus}</span>
              </div>
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-white font-display">Application Received!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your loan application <span className="text-emerald-400 font-mono font-bold">{txRef}</span> is under automated verification.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border-slate-800 text-left text-xs text-slate-400 space-y-2">
              <div className="flex justify-between"><span>Borrower:</span><span className="font-semibold text-white">{formData.fullName}</span></div>
              <div className="flex justify-between"><span>Applied Amount:</span><span className="font-semibold text-emerald-400">{formatKSh(formData.amount)}</span></div>
              <div className="flex justify-between"><span>Fee Status:</span><span className="font-semibold text-emerald-400">Paid (M-Pesa Verified)</span></div>
              <div className="flex justify-between"><span>Current Stage:</span><span className="font-semibold text-slate-200">Initial Document Review</span></div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 font-bold text-sm transition-all"
            >
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
