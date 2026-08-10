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
    img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=800',
    label: 'Retail & small shops',
    alt: 'Kenyan retail shop owner at a vibrant local duka market stall',
    Icon: Store,
  },
  {
    img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800',
    label: 'Agriculture & farming',
    alt: 'Kenyan smallholder farmer tending to fresh agricultural crops',
    Icon: Leaf,
  },
  {
    img: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=800',
    label: 'Transport services',
    alt: 'Kenyan Boda Boda rider and urban transport operator on street',
    Icon: Truck,
  },
  {
    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=800',
    label: 'Wholesale & distribution',
    alt: 'Kenyan wholesale trader loading produce sacks at a local market hub',
    Icon: Package,
  },
  {
    img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800',
    label: 'Salon & beauty services',
    alt: 'Kenyan hair stylist and kinyozi barber serving clients',
    Icon: Scissors,
  },
  {
    img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
    label: 'Food & restaurant vendors',
    alt: 'Kenyan kibanda street food vendor serving fresh local meals',
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
            {SECTORS.map(({ img, fallback, label, alt, Icon }) => (
              <div className="sector-card-item" key={label}>
                <div className="sector-card-img-wrap">
                  <img
                    src={img}
                    alt={alt}
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
