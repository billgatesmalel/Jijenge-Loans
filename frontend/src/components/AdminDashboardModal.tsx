import React, { useState } from 'react';
import { X, Lock, Search } from 'lucide-react';
import { formatKSh } from '../lib/shared';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_APPLICATIONS = [
  { id: '1', transactionRef: 'JJG-78A92K', fullName: 'Samuel Mwangi Kamau', phoneNumber: '0712345678', nationalId: '28945123', amount: 25000, feeStatus: 'Paid', status: 'Pending Approval', allocatedBalance: 0 },
  { id: '2', transactionRef: 'JJG-44B10X', fullName: 'Jane Wambui Njoroge', phoneNumber: '0722998877', nationalId: '30124599', amount: 35000, feeStatus: 'Paid', status: 'Approved', allocatedBalance: 35000 },
  { id: '3', transactionRef: 'JJG-99C12Z', fullName: 'Peter Otieno Ochieng', phoneNumber: '0733112233', nationalId: '25410988', amount: 50000, feeStatus: 'Pending STK Push', status: 'Pending STK Fee Payment', allocatedBalance: 0 },
  { id: '4', transactionRef: 'JJG-12D88M', fullName: 'Grace Nyambura Kariuki', phoneNumber: '0701445566', nationalId: '31876543', amount: 15000, feeStatus: 'Paid', status: 'Approved', allocatedBalance: 15000 }
];

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('admin@jijengeloans.co.ke');
  const [password, setPassword] = useState('Jijenge2026!SecureAdminPass');
  const [search, setSearch] = useState('');
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [selectedLoan, setSelectedLoan] = useState<typeof MOCK_APPLICATIONS[0] | null>(null);
  const [allocateAmount, setAllocateAmount] = useState('25000');

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(true);
  };

  const handleAllocate = (loanId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === loanId
          ? { ...app, allocatedBalance: Number(allocateAmount), status: 'Approved' }
          : app
      )
    );
    setSelectedLoan(null);
    alert('Loan balance allocated successfully!');
  };

  const filteredApps = applications.filter(
    (app) =>
      app.fullName.toLowerCase().includes(search.toLowerCase()) ||
      app.transactionRef.toLowerCase().includes(search.toLowerCase()) ||
      app.phoneNumber.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 my-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isAuthenticated ? (
          <div className="max-w-md mx-auto py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-display">Super Admin Portal</h3>
                <p className="text-xs text-slate-400">Jijenge Loans Management Engine</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all"
              >
                Authenticate Admin Access
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-white font-display">Jijenge Admin Dashboard</h3>
                <p className="text-xs text-slate-400">Logged in as: admin@jijengeloans.co.ke (SUPER_ADMIN)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Total Applications</div>
                <div className="text-2xl font-extrabold text-white font-display">1,248</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Paid Processing Fees</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-display">KSh 561,600</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Approved Loans</div>
                <div className="text-2xl font-extrabold text-white font-display">892</div>
              </div>
              <div className="glass-panel p-4 rounded-2xl border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Disbursed Balance</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-display">KSh 22.3M</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name, ref, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Ref</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Fee Status</th>
                    <th className="p-3">Loan Status</th>
                    <th className="p-3">Allocated Balance</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">{app.transactionRef}</td>
                      <td className="p-3 font-semibold text-white">{app.fullName}</td>
                      <td className="p-3">{app.phoneNumber}</td>
                      <td className="p-3 font-semibold">{formatKSh(app.amount)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${app.feeStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {app.feeStatus}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-200">{app.status}</td>
                      <td className="p-3 font-bold text-emerald-400">{formatKSh(app.allocatedBalance)}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedLoan(app)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-[11px] transition-colors"
                        >
                          Allocate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedLoan && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="text-sm font-bold text-white">Allocate Loan Balance to {selectedLoan.fullName} ({selectedLoan.transactionRef})</div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={allocateAmount}
                    onChange={(e) => setAllocateAmount(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => handleAllocate(selectedLoan.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                  >
                    Confirm Balance Allocation
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
