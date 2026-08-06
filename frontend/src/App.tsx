import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { LoanCalculator } from './components/LoanCalculator';
import { SectorMosaic } from './components/SectorMosaic';
import { Footer } from './components/Footer';
import { ApplicationFormModal } from './components/ApplicationFormModal';
import { CustomerDashboardModal } from './components/CustomerDashboardModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { SupportChatModal } from './components/SupportChatModal';

export const App: React.FC = () => {
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const [selectedPkg, setSelectedPkg] = useState('Jijenge Micro Booster');
  const [selectedAmount, setSelectedAmount] = useState(25000);

  const handleSelectPackage = (packageName: string, amount: number) => {
    setSelectedPkg(packageName);
    setSelectedAmount(amount);
    setApplyModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar
        onOpenApply={() => setApplyModalOpen(true)}
        onOpenCustomer={() => setCustomerModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onOpenSupport={() => setSupportModalOpen(true)}
      />

      <main className="flex-1">
        <Hero
          onOpenApply={() => setApplyModalOpen(true)}
          onOpenCustomer={() => setCustomerModalOpen(true)}
        />

        <LoanCalculator onSelectPackage={handleSelectPackage} />

        <SectorMosaic />
      </main>

      <Footer />

      <ApplicationFormModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        initialPackage={selectedPkg}
        initialAmount={selectedAmount}
      />

      <CustomerDashboardModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
      />

      <AdminDashboardModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      <SupportChatModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
};

export default App;
