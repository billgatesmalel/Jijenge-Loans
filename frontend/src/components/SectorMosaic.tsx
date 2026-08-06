import React from 'react';
import { Store, Tractor, Truck, Scissors, ShoppingBag, HardHat } from 'lucide-react';

const SECTORS = [
  { icon: Store, name: 'Retail & General Trade', desc: 'Stock replenishment & shop inventory funding' },
  { icon: Tractor, name: 'Agribusiness & Produce', desc: 'Farm inputs, grain trade & produce aggregation' },
  { icon: Truck, name: 'Transport & Logistics', desc: 'Boda boda, fleet maintenance & spare parts' },
  { icon: Scissors, name: 'Salon, Spa & Beauty', desc: 'Equipment upgrades & beauty inventory' },
  { icon: ShoppingBag, name: 'Boutique & Apparel', desc: 'Fashion importation & retail pop-ups' },
  { icon: HardHat, name: 'Hardware & Construction', desc: 'Material supply & contractor cash flow' }
];

export const SectorMosaic: React.FC = () => {
  return (
    <section id="sectors" className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display">
            Tailored Financing for Every Kenyan Entrepreneur
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            Whether running a retail store in Nyamakima, a produce hub in Eldoret, or a salon in Kilimani, Jijenge Loans provides instant capital.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECTORS.map((sector) => {
            const Icon = sector.icon;
            return (
              <div
                key={sector.name}
                className="glass-panel p-6 rounded-3xl border-slate-800/80 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{sector.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{sector.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
