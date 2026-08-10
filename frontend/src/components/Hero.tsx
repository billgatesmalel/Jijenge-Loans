import React, { useState, useRef, useCallback } from 'react';
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
    img: '/images/retail_shop.png',
    fallback: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=800',
    label: 'Retail & small shops',
    alt: 'Kenyan duka shopkeeper serving customers at a vibrant local grocery kiosk',
    Icon: Store,
  },
  {
    img: '/images/agriculture.png',
    fallback: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
    label: 'Agriculture & farming',
    alt: 'Kenyan smallholder farmer picking tea leaves in the lush highland fields',
    Icon: Leaf,
  },
  {
    img: '/images/transport.png',
    fallback: 'https://images.unsplash.com/photo-1583508805133-8fd03d734d1c?auto=format&fit=crop&q=80&w=800',
    label: 'Transport services',
    alt: 'Colorful Kenyan Matatu minibus and Boda Boda motorcycles on a busy Nairobi street',
    Icon: Truck,
  },
  {
    img: '/images/wholesale.png',
    fallback: 'https://images.unsplash.com/photo-1504945005722-33670dcaf685?auto=format&fit=crop&q=80&w=800',
    label: 'Wholesale & distribution',
    alt: 'Kenyan wholesale traders sorting and loading produce sacks at Wakulima market hub',
    Icon: Package,
  },
  {
    img: '/images/salon.png',
    fallback: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800',
    label: 'Salon & beauty services',
    alt: 'Kenyan hair stylist braiding cornrows in a colourful local salon and kinyozi',
    Icon: Scissors,
  },
  {
    img: '/images/food.png',
    fallback: 'https://images.unsplash.com/photo-1567514933737-cd7e4e3b5d5f?auto=format&fit=crop&q=80&w=800',
    label: 'Food & restaurant vendors',
    alt: 'Kenyan kibanda food vendor serving nyama choma ugali and chapati at a local eatery',
    Icon: Utensils,
  },
];

/* 3 pagination dots: each dot represents 2 cards */
const DOT_COUNT = 3;

export const Hero: React.FC<HeroProps> = ({ onTabChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const dotIndex = Math.min(
      DOT_COUNT - 1,
      Math.round((scrollLeft / maxScroll) * (DOT_COUNT - 1))
    );
    setActiveIndex(dotIndex);
  }, []);

  const scrollToIndex = (dotIdx: number) => {
    if (!scrollRef.current) return;
    const { scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const targetScroll = (dotIdx / (DOT_COUNT - 1)) * maxScroll;
    scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setActiveIndex(dotIdx);
  };

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

          {/* Trust bar */}
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

        {/* ── Right: Sector Cards — Swipe on mobile / 3-col grid on desktop ── */}
        <div className="hero-right-wrap">

          {/* Scroll container (flex snap on mobile, grid on md+) */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="sectors-grid"
            aria-label="SME Business Sectors Funded"
          >
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

          {/* Interactive pagination dots — hidden on desktop */}
          <div className="sectors-dots">
            {Array.from({ length: DOT_COUNT }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={`sec-dot${activeIndex === idx ? ' active' : ''}`}
                aria-label={`Go to slide group ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
