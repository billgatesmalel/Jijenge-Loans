import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { ApplicationFormModal } from './components/ApplicationFormModal';
import { CustomerDashboardModal } from './components/CustomerDashboardModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { SupportChatModal } from './components/SupportChatModal';
import { TrackLoanView } from './components/TrackLoanView';
import { Zap, ShieldCheck, Landmark, BarChart3, Lock as LockIcon, Users, MessageCircle, ArrowRight } from 'lucide-react';
class TrackErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Track loan error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-16 px-6 max-w-lg mx-auto">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-extrabold text-brand-navy mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-brand-muted mb-6 leading-relaxed">
            We couldn't load the loan tracking page. Please refresh the page and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ borderRadius: '12px' }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const getInitialHash = () => {
    if (window.location.hash) {
      return window.location.hash;
    }
    const saved = sessionStorage.getItem('jijenge_active_tab');
    if (saved) {
      return saved.startsWith('#') ? saved : `#${saved}`;
    }
    return '#home';
  };

  const [currentHash, setCurrentHash] = useState(getInitialHash);
  const [supportOpen, setSupportOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What are the requirements to apply?',
      a: 'To qualify for a Jijenge Loan, you must be a Kenyan citizen over 18 years old, possess a valid National ID, and have an active M-Pesa account used for mobile money transactions.',
    },
    {
      q: 'How fast will I receive funds in M-Pesa?',
      a: 'Once your application is submitted and approved, funds are automatically disbursed to your M-Pesa line within seconds, 24 hours a day, 7 days a week.',
    },
    {
      q: 'Is any collateral or guarantor needed?',
      a: 'No! All Jijenge Loans are 100% collateral-free and require zero physical guarantors. Approval is based on your digital credit score.',
    },
    {
      q: 'How do I repay my loan?',
      a: 'You can repay directly via our M-Pesa Paybill number or using the automated M-Pesa STK push prompt sent before your due date.',
    },
  ];

  useEffect(() => {
    // If window.location.hash is missing on mount, sync with saved tab in sessionStorage
    const initial = getInitialHash();
    if (!window.location.hash && initial !== '#home') {
      window.location.hash = initial.replace('#', '');
    }

    const handleHashChange = () => {
      const newHash = window.location.hash || '#home';
      setCurrentHash(newHash);
      const cleanTab = newHash.replace('#', '');
      if (cleanTab) {
        sessionStorage.setItem('jijenge_active_tab', cleanTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const switchTab = (tabId: string) => {
    const cleanTab = tabId.replace('#', '');
    sessionStorage.setItem('jijenge_active_tab', cleanTab);
    window.location.hash = cleanTab;
    setCurrentHash(`#${cleanTab}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const getActiveTab = () => {
    const hash = currentHash.replace('#', '');
    const validTabs = ['home', 'apply', 'how-it-works', 'faqs', 'track'];
    return validTabs.includes(hash) ? hash : 'home';
  };

  const activeTab = getActiveTab();

  // Route portal modals based on hash
  if (currentHash === '#customer') {
    return (
      <div className="portal-container login-active">
        <CustomerDashboardModal onClose={() => switchTab('home')} onOpenSupport={() => setSupportOpen(true)} />
        <SupportChatModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
      </div>
    );
  }

  if (currentHash === '#admin') {
    return (
      <div>
        <AdminDashboardModal onClose={() => switchTab('home')} />
      </div>
    );
  }

  return (
    <div className="site-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentTab={activeTab}
        onTabChange={switchTab}
        onOpenSupport={() => setSupportOpen(true)}
      />

      <main className="tab-content-wrapper" style={{ flex: 1 }}>
        {/* Tab 1: Home View */}
        <section className={`tab-pane ${activeTab === 'home' ? 'active' : ''}`} id="home">
          <Hero onTabChange={switchTab} />

          {/* Compliance trust strip */}
          <div className="container">
            <div className="compliance-strip">
              <div className="compliance-strip-inner">
                <div className="compliance-item">
                  <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                  <span>CBK Licensed Lender</span>
                </div>
                <div className="compliance-divider" aria-hidden="true" />
                <div className="compliance-item">
                  <LockIcon size={18} strokeWidth={2.2} aria-hidden="true" />
                  <span>256-bit SSL Secure</span>
                </div>
                <div className="compliance-divider" aria-hidden="true" />
                <div className="compliance-item">
                  <Zap size={18} strokeWidth={2.2} aria-hidden="true" />
                  <span>Funds in &lt; 15 Minutes</span>
                </div>
                <div className="compliance-divider" aria-hidden="true" />
                <div className="compliance-item">
                  <Landmark size={18} strokeWidth={2.2} aria-hidden="true" />
                  <span>ODPC Data Protected</span>
                </div>
                <div className="compliance-divider" aria-hidden="true" />
                <div className="compliance-item">
                  <Users size={18} strokeWidth={2.2} aria-hidden="true" />
                  <span>50,000+ Businesses Funded</span>
                </div>
              </div>
            </div>
          </div>

          {/* Why Business Owners Trust Us Section */}
          <div className="container trust-section" id="trust">
            <div className="section-title-wrap text-center">
              <span className="sub-tag">Trusted Across Kenya</span>
              <h2 className="section-heading">Why business owners trust us</h2>
              <p className="section-subheading">Fast, transparent, and collateral-free funding built specifically for Kenyan SMEs and entrepreneurs.</p>
            </div>

            <div className="trust-grid">
              <div className="trust-card">
                <div className="trust-icon-box">
                  <Zap size={22} strokeWidth={2} aria-hidden="true" />
                </div>
                <h3>Instant M-Pesa Disbursal</h3>
                <p>Approved funds hit your registered M-Pesa line in under 15 minutes, 24/7/365.</p>
              </div>

              <div className="trust-card">
                <div className="trust-icon-box">
                  <ShieldCheck size={22} strokeWidth={2} aria-hidden="true" />
                </div>
                <h3>100% Collateral-Free</h3>
                <p>No physical guarantors, logbooks, or land title deeds required. Digital credit scoring.</p>
              </div>

              <div className="trust-card">
                <div className="trust-icon-box">
                  <Landmark size={22} strokeWidth={2} aria-hidden="true" />
                </div>
                <h3>CBK Licensed Security</h3>
                <p>Licensed by the Central Bank of Kenya with full ODPC Data Protection compliance.</p>
              </div>

              <div className="trust-card">
                <div className="trust-icon-box">
                  <BarChart3 size={22} strokeWidth={2} aria-hidden="true" />
                </div>
                <h3>Transparent & Fair Terms</h3>
                <p>No hidden maintenance fees or surprise penalties. Clear upfront repayment schedule.</p>
              </div>
            </div>

            {/* Trust Stats Strip */}
            <div className="trust-stats-strip">
              <div className="stat-box">
                <span className="stat-number">50,000+</span>
                <span className="stat-label">Kenyan Businesses Funded</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">KES 2.5B+</span>
                <span className="stat-label">Capital Disbursed</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">&lt; 15 Mins</span>
                <span className="stat-label">Average Payout Time</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">99.4%</span>
                <span className="stat-label">Customer Satisfaction</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab 2: Apply Form View */}
        <section className={`tab-pane ${activeTab === 'apply' ? 'active' : ''}`} id="apply">
          <ApplicationFormModal onTabChange={switchTab} />
        </section>

        {/* Tab 3: How It Works View */}
        <section className={`tab-pane ${activeTab === 'how-it-works' ? 'active' : ''}`} id="how-it-works">
          <div className="container">
            <div className="section-title-wrap text-center">
              <span className="sub-tag">Simple Process</span>
              <h2 className="section-heading">Apply in 3 Easy Steps</h2>
              <p className="section-subheading">No physical forms, no branch visits, 100% digital application</p>
            </div>

            <div className="process-stepper">
              <div className="process-step active">
                <div className="step-num">1</div>
                <h3>1. Apply Online</h3>
                <p>Fill in your personal &amp; business details in under 2 minutes.</p>
              </div>

              <div className="process-line" aria-hidden="true"></div>

              <div className="process-step active">
                <div className="step-num">2</div>
                <h3>2. Automated Credit Assessment</h3>
                <p>Our credit scoring engine assesses your financial profile and matches an offer instantly.</p>
              </div>

              <div className="process-line" aria-hidden="true"></div>

              <div className="process-step active">
                <div className="step-num">3</div>
                <h3>3. Receive M-Pesa</h3>
                <p>Accept your matched offer and receive funds directly to your registered M-Pesa line.</p>
              </div>
            </div>

            <div className="tab-cta-box how-it-works-cta">
              <h3>Ready to get funded?</h3>
              <button type="button" className="btn-cta-large" onClick={() => switchTab('apply')}>
                Fill Application Details Now &rarr;
              </button>
            </div>
          </div>
        </section>

        {/* Tab 4: FAQs View */}
        <section className={`tab-pane ${activeTab === 'faqs' ? 'active' : ''}`} id="faqs">
          <div className="container">
            <div className="section-title-wrap text-center">
              <span className="sub-tag">Got Questions?</span>
              <h2 className="section-heading">Frequently Asked Questions</h2>
              <p className="section-subheading">Everything you need to know about Jijenge Loans</p>
            </div>

            <div className="faq-accordion">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`faq-item${isOpen ? ' faq-item--open' : ''}`}
                  >
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-question-text">{faq.q}</span>
                      <div className={`faq-icon-wrap${isOpen ? ' faq-icon-wrap--open' : ''}`}>
                        <svg
                          className="faq-icon-svg"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          aria-hidden="true"
                        >
                          {isOpen ? (
                            /* Minus icon (−) */
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                          ) : (
                            /* Plus icon (+) */
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          )}
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="faq-answer-content">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="tab-cta-box">
              <h3>Have more questions or ready to get funded?</h3>
              <p>Get approved in under 15 minutes with zero collateral required.</p>
              <div className="tab-cta-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => switchTab('apply')}
                  style={{ borderRadius: '12px' }}
                >
                  <span>Apply Now</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSupportOpen(true)}
                  style={{ borderRadius: '12px' }}
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  <span>Talk to Support</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tab 5: Track Loan View */}
        <section className={`tab-pane ${activeTab === 'track' ? 'active' : ''}`} id="track">
          <TrackErrorBoundary>
            <TrackLoanView onTabChange={switchTab} onOpenSupport={() => setSupportOpen(true)} />
          </TrackErrorBoundary>
        </section>
      </main>

      <Footer onTabChange={switchTab} onOpenSupport={() => setSupportOpen(true)} />
      <SupportChatModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
};

export default App;
