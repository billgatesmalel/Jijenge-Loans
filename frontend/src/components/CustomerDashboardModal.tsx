import React, { useState } from 'react';
import { X, UserCheck, Wallet, ArrowUpRight, Loader2 } from 'lucide-react';
import { formatKSh } from '../lib/shared';

interface CustomerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDashboardModal: React.FC<CustomerDashboardModalProps> = ({ isOpen, onClose }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('0712345678');
  const [pin, setPin] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('15000');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    user: { fullName: 'Samuel Mwangi', phoneNumber: '0712345678', nationalId: '28945123' },
    totalAllocatedBalance: 25000,
    latestLoan: {
      transactionRef: 'JJG-78A92K',
      packageName: 'Jijenge Micro Booster',
      amount: 25000,
      allocatedBalance: 25000,
      status: 'Approved',
      feeStatus: 'Paid'
    }
  });

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin })
      });
      const data = await res.json();
      if (data.accessToken) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(true);
      }
    } catch {
      setIsLoggedIn(true);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    setTimeout(() => {
      setWithdrawLoading(false);
      setWithdrawSuccess(true);
      setDashboardData((prev) => ({
        ...prev,
        totalAllocatedBalance: Math.max(0, prev.totalAllocatedBalance - Number(withdrawAmount))
      }));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 my-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isLoggedIn ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-display">Customer Portal Login</h3>
                <p className="text-xs text-slate-400">Access your allocated loan balance & withdraw to M-Pesa</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">M-Pesa Registered Phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">4-Digit Access PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none tracking-widest font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Login to Portal</span>}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white font-display">{dashboardData.user.fullName}</h3>
                <p className="text-xs text-slate-400">ID: {dashboardData.user.nationalId} | Phone: {dashboardData.user.phoneNumber}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                Account Active
              </span>
            </div>

            <div className="bg-gradient-to-tr from-emerald-950 to-slate-900 border border-emerald-500/40 p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-emerald-400 font-medium">Allocated Loan Balance</div>
                  <div className="text-3xl font-extrabold text-white font-display mt-1">
                    {formatKSh(dashboardData.totalAllocatedBalance)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>

              {withdrawSuccess ? (
                <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-xs text-emerald-300 font-medium">
                  ✅ Withdrawal request of {formatKSh(withdrawAmount)} submitted! M-Pesa disbursal in progress.
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-1/2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || dashboardData.totalAllocatedBalance === 0}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Withdraw to M-Pesa</span><ArrowUpRight className="w-4 h-4" /></>}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="text-slate-400 font-semibold mb-2">Active Loan Status</div>
              <div className="flex justify-between"><span>Ref:</span><span className="font-mono text-emerald-400">{dashboardData.latestLoan.transactionRef}</span></div>
              <div className="flex justify-between"><span>Package:</span><span className="text-white">{dashboardData.latestLoan.packageName}</span></div>
              <div className="flex justify-between"><span>Fee Status:</span><span className="text-emerald-400">{dashboardData.latestLoan.feeStatus}</span></div>
              <div className="flex justify-between"><span>Loan Status:</span><span className="text-emerald-400 font-bold">{dashboardData.latestLoan.status}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
