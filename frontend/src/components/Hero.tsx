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
    // Kenyan open-air market stall with fresh produce
    img: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    label: 'Retail & small shops',
    alt: 'Kenyan retail shop owner at a vibrant local duka market stall',
    Icon: Store,
  },
  {
    // African farmer in green vegetable/crop field
    img: 'https://images.unsplash.com/photo-1627920769842-e32f83dcedb8?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
    label: 'Agriculture & farming',
    alt: 'Kenyan smallholder farmer harvesting fresh agricultural crops in the highlands',
    Icon: Leaf,
  },
  {
    // Colorful Matatu / motorcycle transport Africa
    img: 'https://images.unsplash.com/photo-1583508805133-8fd03d734d1c?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800',
    label: 'Transport services',
    alt: 'Kenyan Matatu minibus transport operator and Boda Boda motorcycles on a busy street',
    Icon: Truck,
  },
  {
    // African market trader with sacks of goods / wholesale
    img: 'https://images.unsplash.com/photo-1504945005722-33670dcaf685?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
    label: 'Wholesale & distribution',
    alt: 'Kenyan wholesale market trader loading and distributing goods at a busy market hub',
    Icon: Package,
  },
  {
    // African hair braiding / salon stylist at work
    img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=800',
    label: 'Salon & beauty services',
    alt: 'Kenyan hair braider and kinyozi barber providing beauty services to local clients',
    Icon: Scissors,
  },
  {
    // African street food cooking / local eatery
    img: 'https://images.unsplash.com/photo-1567514933737-cd7e4e3b5d5f?auto=format&fit=crop&q=80&w=800',
    fallback: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
    label: 'Food & restaurant vendors',
    alt: 'Kenyan kibanda food vendor cooking and serving fresh local meals at street eatery',
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
