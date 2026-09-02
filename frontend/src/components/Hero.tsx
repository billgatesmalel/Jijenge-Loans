import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
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

export const Hero: React.FC<HeroProps> = ({ onTabChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to measure card step width (width + gap)
  const getStepWidth = useCallback(() => {
    if (!scrollRef.current) return 0;
    const card = scrollRef.current.querySelector('.sector-card-item') as HTMLElement;
    if (!card) return 0;
    return card.offsetWidth + 12; // card width + gap
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const stepWidth = getStepWidth();
    const targetLeft = index * stepWidth;
    scrollRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
    setActiveIndex(index);
  }, [getStepWidth]);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => {
      const nextIndex = (prev + 1) % SECTORS.length;
      scrollToIndex(nextIndex);
      return nextIndex;
    });
  }, [scrollToIndex]);

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => {
      const prevIndex = (prev - 1 + SECTORS.length) % SECTORS.length;
      scrollToIndex(prevIndex);
      return prevIndex;
    });
  }, [scrollToIndex]);

  // Auto-swipe to the left card-by-card every 3.5 seconds when active
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      if (scrollRef.current && scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
        handleNext();
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, handleNext]);

  // Listen to manual scroll events (finger touch swipe) to update active index
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const stepWidth = getStepWidth();
    if (stepWidth <= 0) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const calculatedIndex = Math.min(
      SECTORS.length - 1,
      Math.max(0, Math.round(scrollLeft / stepWidth))
    );
    setActiveIndex(calculatedIndex);
  }, [getStepWidth]);

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
            Grow your business with{' '}
            <em className="hero-headline__accent">fast, collateral-free</em> funding
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

        {/* ── Right: Sector Cards — Auto-swiping / interactive carousel on mobile/tablet ── */}
        <div
          className="hero-right-wrap"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 4000)}
        >
          {/* Scroll container (flex snap on mobile, grid on lg+) */}
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

          {/* Interactive Carousel Controls (Prev/Next buttons & 6 slide dots) */}
          <div className="sectors-carousel-controls" aria-label="Category Carousel Controls">
            <button
              type="button"
              className="carousel-arr-btn carousel-arr-prev"
              onClick={handlePrev}
              aria-label="Previous business category"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>

            <div className="sectors-dots" role="tablist" aria-label="Category image slides">
              {SECTORS.map((sector, idx) => (
                <button
                  key={sector.label}
                  onClick={() => scrollToIndex(idx)}
                  className={`sec-dot${activeIndex === idx ? ' active' : ''}`}
                  aria-label={`Go to ${sector.label} slide`}
                  aria-selected={activeIndex === idx}
                  role="tab"
                />
              ))}
            </div>

            <button
              type="button"
              className="carousel-arr-btn carousel-arr-next"
              onClick={handleNext}
              aria-label="Next business category"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
