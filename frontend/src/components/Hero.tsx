import React from 'react';
import { ArrowRight, ChevronRight, ShieldCheck, Zap, Lock } from 'lucide-react';

interface HeroProps {
  onTabChange: (tabId: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onTabChange }) => {
  return (
    <div className="hero-section">
      <div className="container hero-layout">
        {/* ── Left: Hero Content ── */}
        <div className="hero-content">

          {/* Trust tag with live pulse */}
          <div className="hero-trust-tag" aria-label="Licensed financial institution">
            <span className="trust-pulse" aria-hidden="true" />
            CBK Licensed Business Lender · Kenya
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            Grow your business<br />
            with{' '}
            <em className="hero-headline__accent">fast, collateral&#8209;free</em>
            <br />funding
          </h1>

          {/* Sub text */}
          <p className="hero-subtext">
            Get flexible capital from{' '}
            <strong>Ksh&nbsp;5,000 to Ksh&nbsp;100,000</strong>. Apply entirely online in
            under&nbsp;2&nbsp;minutes and receive funds directly on your M-Pesa line — 24/7.
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
              <ChevronRight size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Trust checkmarks */}
          <div className="hero-checkmarks" role="list" aria-label="Key benefits">
            <div className="check-item" role="listitem">
              <ShieldCheck size={15} strokeWidth={2.5} className="check-icon-svg" aria-hidden="true" />
              <span>No physical guarantors</span>
            </div>
            <div className="check-item" role="listitem">
              <Zap size={15} strokeWidth={2.5} className="check-icon-svg" aria-hidden="true" />
              <span>Instant M-Pesa payout</span>
            </div>
            <div className="check-item" role="listitem">
              <Lock size={15} strokeWidth={2.5} className="check-icon-svg" aria-hidden="true" />
              <span>ODPC data protected</span>
            </div>
          </div>
        </div>

        {/* ── Right: Mosaic Grid ── */}
        <div className="hero-mosaic-grid" aria-hidden="true">
          <div className="mosaic-col">
            <div className="sector-card card-tall">
              <img
                src="/images/retail_shop.jpg"
                alt="Retail & small shops"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'; }}
              />
              <div className="sector-pill">Retail &amp; small shops</div>
            </div>
            <div className="sector-card card-short">
              <img
                src="/images/wholesale.jpg"
                alt="Wholesale & distribution"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&q=80&w=600'; }}
              />
              <div className="sector-pill">Wholesale &amp; distribution</div>
            </div>
          </div>

          <div className="mosaic-col">
            <div className="sector-card card-short">
              <img
                src="/images/agriculture.jpg"
                alt="Agriculture & farming"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600'; }}
              />
              <div className="sector-pill">Agriculture &amp; farming</div>
            </div>
            <div className="sector-card card-extra-tall">
              <img
                src="/images/salon.jpg"
                alt="Salon & beauty services"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600'; }}
              />
              <div className="sector-pill">Salon &amp; beauty services</div>
            </div>
          </div>

          <div className="mosaic-col">
            <div className="sector-card card-medium">
              <img
                src="/images/transport.jpg"
                alt="Transport services"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&q=80&w=600'; }}
              />
              <div className="sector-pill">Transport services</div>
            </div>
            <div className="sector-card card-medium">
              <img
                src="/images/food.jpg"
                alt="Food & restaurant vendors"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600'; }}
              />
              <div className="sector-pill">Food &amp; restaurant vendors</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
