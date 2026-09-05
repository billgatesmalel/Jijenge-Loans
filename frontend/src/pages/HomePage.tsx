import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ShieldCheck, Lock as LockIcon, Zap, Landmark, Users, BarChart3 } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleTabChange = (tabId: string) => {
    if (tabId === 'apply') {
      navigate('/apply');
    } else if (tabId === 'how-it-works') {
      navigate('/how-it-works');
    } else {
      navigate(`/${tabId}`);
    }
  };

  return (
    <div className="home-page-view">
      <Hero onTabChange={handleTabChange} />

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
          <p className="section-subheading">
            Fast, transparent, and collateral-free funding built specifically for Kenyan SMEs and entrepreneurs.
          </p>
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
    </div>
  );
};

export default HomePage;
