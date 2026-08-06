import React from 'react';

interface HeroProps {
  onTabChange: (tabId: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onTabChange }) => {
  return (
    <div className="container hero-layout">
      {/* Left Hero Content */}
      <div className="hero-content">
        <div className="hero-trust-tag">
          Trusted business loans approved daily across Kenya
        </div>

        <h1 className="hero-headline">
          Grow your business with fast, collateral-free funding
        </h1>

        <p className="hero-subtext">
          Get flexible, friction-free capital from <strong>Ksh 5,000 to Ksh 100,000</strong>. Apply entirely online in under 15 minutes and receive money directly on your M-Pesa line.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => onTabChange('apply')}
          >
            <span>Apply now</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>

          <button
            type="button"
            className="btn-hero-secondary"
            onClick={() => onTabChange('how-it-works')}
          >
            <span>How it works</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Trust Checkmarks Row */}
        <div className="hero-checkmarks">
          <div className="check-item">
            <span className="check-icon">✓</span>
            <span>No physical guarantors</span>
          </div>
          <div className="check-item">
            <span className="check-icon">✓</span>
            <span>Instant M-Pesa payout</span>
          </div>
          <div className="check-item">
            <span className="check-icon">✓</span>
            <span>ODPC data protected</span>
          </div>
        </div>
      </div>

      {/* Right Hero Mosaic Grid */}
      <div className="hero-mosaic-grid">
        <div className="mosaic-col">
          <div className="sector-card card-tall">
            <img src="/images/retail_shop.jpg" alt="Retail & small shops" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'; }} />
            <div className="sector-pill">Retail & small shops</div>
          </div>

          <div className="sector-card card-short">
            <img src="/images/wholesale.jpg" alt="Wholesale & distribution" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&q=80&w=600'; }} />
            <div className="sector-pill">Wholesale & distribution</div>
          </div>
        </div>

        <div className="mosaic-col">
          <div className="sector-card card-short">
            <img src="/images/agriculture.jpg" alt="Agriculture & farming" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600'; }} />
            <div className="sector-pill">Agriculture & farming</div>
          </div>

          <div className="sector-card card-extra-tall">
            <img src="/images/salon.jpg" alt="Salon & beauty services" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600'; }} />
            <div className="sector-pill">Salon & beauty services</div>
          </div>
        </div>

        <div className="mosaic-col">
          <div className="sector-card card-medium">
            <img src="/images/transport.jpg" alt="Transport services" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&q=80&w=600'; }} />
            <div className="sector-pill">Transport services</div>
          </div>

          <div className="sector-card card-medium">
            <img src="/images/food.jpg" alt="Food & restaurant vendors" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600'; }} />
            <div className="sector-pill">Food & restaurant vendors</div>
          </div>
        </div>
      </div>
    </div>
  );
};
