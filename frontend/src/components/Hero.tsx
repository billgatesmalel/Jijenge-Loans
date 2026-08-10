import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Store,
  Leaf,
  Truck,
  Package,
  Scissors,
  Utensils,
} from 'lucide-react';

interface HeroProps {
  onTabChange: (tabId: string) => void;
}

const SECTORS = [
  {
    img: '/images/retail_shop.jpg',
    fallback: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
    label: 'Retail & small shops',
    Icon: Store,
  },
  {
    img: '/images/agriculture.jpg',
    fallback: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600',
    label: 'Agriculture & farming',
    Icon: Leaf,
  },
  {
    img: '/images/transport.jpg',
    fallback: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&q=80&w=600',
    label: 'Transport services',
    Icon: Truck,
  },
  {
    img: '/images/wholesale.jpg',
    fallback: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&q=80&w=600',
    label: 'Wholesale & distribution',
    Icon: Package,
  },
  {
    img: '/images/salon.jpg',
    fallback: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600',
    label: 'Salon & beauty services',
    Icon: Scissors,
  },
  {
    img: '/images/food.jpg',
    fallback: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600',
    label: 'Food & restaurant vendors',
    Icon: Utensils,
  },
];

export const Hero: React.FC<HeroProps> = ({ onTabChange }) => {
  return (
    <div className="hero-section">
      <div className="container hero-layout">

        {/* ── Left: Hero Content ── */}
        <div className="hero-content">

          {/* Trust tag */}
          <div className="hero-trust-tag" aria-label="Licensed financial institution">
            <span className="trust-pulse" aria-hidden="true" />
            CBK Licensed Business Lender · Kenya
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            Grow your business<br />
            with <em className="hero-headline__accent">fast,<br />
            collateral-free</em><br />
            funding
          </h1>

          {/* Sub text */}
          <p className="hero-subtext">
            Get flexible capital from{' '}
            <strong>Ksh 5,000 to Ksh 100,000</strong>. Apply entirely online in
            under 2 minutes and receive funds directly on your M-Pesa line — 24/7.
          </p>

          {/* CTAs */}
          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => onTabChange('apply')}
              aria-label="Start your loan application"
            >
              Apply Now
              <span className="cta-arrow" aria-hidden="true">
                <ArrowRight size={18} strokeWidth={2.5} />
              </span>
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => onTabChange('how-it-works')}
              aria-label="Learn how our loan process works"
            >
              How it works
              <span className="cta-arrow" aria-hidden="true">
                <ArrowRight size={17} strokeWidth={2.5} />
              </span>
            </button>
          </div>

          {/* Trust bar container */}
          <div className="hero-trust-bar-container" role="list" aria-label="Key benefits">
            <div className="check-item" role="listitem">
              <ShieldCheck size={20} strokeWidth={2.2} className="check-icon-svg" aria-hidden="true" />
              <span>No physical guarantors</span>
            </div>
            <div className="check-item" role="listitem">
              <Zap size={20} strokeWidth={2.2} className="check-icon-svg" aria-hidden="true" />
              <span>Instant M-Pesa payout</span>
            </div>
            <div className="check-item" role="listitem">
              <Lock size={20} strokeWidth={2.2} className="check-icon-svg" aria-hidden="true" />
              <span>ODPC data protected</span>
            </div>
          </div>
        </div>

        {/* ── Right: Responsive Sector Card Grid ── */}
        <div className="hero-right-wrap">
          <div className="sectors-grid" aria-label="SME Business Sectors Funded">
            {SECTORS.map(({ img, fallback, label, Icon }) => (
              <div className="sector-card-item" key={label}>
                <div className="sector-card-img-wrap">
                  <img
                    src={img}
                    alt={label}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = fallback; }}
                  />
                  <div className="sector-card-gradient-overlay" />
                  <div className="sector-card-floating-badge">
                    <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                  </div>
                </div>
                <div className="sector-card-footer">
                  <span className="sector-card-label">{label}</span>
                  <ArrowRight
                    size={14}
                    strokeWidth={2.5}
                    className="sector-card-arr"
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="sectors-dots" aria-hidden="true">
            <span className="sec-dot active"></span>
            <span className="sec-dot"></span>
            <span className="sec-dot"></span>
          </div>
        </div>

      </div>
    </div>
  );
};
