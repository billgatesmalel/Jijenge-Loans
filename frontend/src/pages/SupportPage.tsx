import React from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { MessageCircle, Phone, Mail, MapPin, Clock, HelpCircle, ShieldCheck, ArrowRight } from 'lucide-react';

interface PublicLayoutContext {
  onOpenSupport?: () => void;
}

export const SupportPage: React.FC<{ onOpenSupport?: () => void }> = ({ onOpenSupport: propOpenSupport }) => {
  const navigate = useNavigate();
  const context = useOutletContext<PublicLayoutContext>();
  const handleOpenChat = propOpenSupport || context?.onOpenSupport;

  return (
    <div className="support-page py-12">
      <div className="container">
        
        {/* Header */}
        <div className="section-title-wrap text-center" style={{ marginBottom: '3rem' }}>
          <span className="sub-tag">We Are Here To Help</span>
          <h1 className="section-heading">Jijenge Loans Support Center</h1>
          <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
            Have questions about your loan application, repayment, or account? Get in touch with our team 24/7.
          </p>
        </div>

        {/* Support Grid */}
        <div className="trust-grid" style={{ marginBottom: '3.5rem' }}>
          
          {/* Card 1: Live Chat */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="trust-icon-box">
              <MessageCircle size={24} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3>24/7 Live Support Chat</h3>
            <p style={{ flex: 1, marginBottom: '1.25rem' }}>
              Chat instantly with our automated loan assistant or live customer care representative.
            </p>
            <button
              type="button"
              className="btn-hero-primary"
              onClick={handleOpenChat}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <MessageCircle size={18} />
              <span>Start Live Chat</span>
            </button>
          </div>

          {/* Card 2: Phone Support */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="trust-icon-box">
              <Phone size={24} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3>Phone Support</h3>
            <p style={{ marginBottom: '0.5rem' }}>
              Speak directly with an agent during business hours.
            </p>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.25rem' }}>
              +254 700 123 456
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 'auto' }}>
              <Clock size={14} />
              <span>Mon – Sat | 8 AM – 8 PM EAT</span>
            </div>
          </div>

          {/* Card 3: Email Support */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="trust-icon-box">
              <Mail size={24} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3>Email Customer Care</h3>
            <p style={{ marginBottom: '0.5rem' }}>
              Send us your inquiry or document attachments.
            </p>
            <a
              href="mailto:support@jijengeloans.co.ke"
              style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-orange)', textDecoration: 'none', marginBottom: '0.25rem' }}
            >
              support@jijengeloans.co.ke
            </a>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
              Average response time: &lt; 2 hours
            </div>
          </div>

          {/* Card 4: Location & Licensing */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="trust-icon-box">
              <MapPin size={24} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3>Nairobi Headquarters</h3>
            <p style={{ marginBottom: '0.5rem' }}>
              Jijenge Loans Ltd Headquarters, Nairobi, Kenya.
            </p>
            <div style={{ fontSize: '0.825rem', color: 'var(--brand-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 'auto' }}>
              <ShieldCheck size={16} style={{ color: 'var(--brand-emerald)' }} />
              <span>CBK Licensed &amp; ODPC Data Protected</span>
            </div>
          </div>

        </div>

        {/* Quick FAQ Link Banner */}
        <div className="tab-cta-box" style={{ background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <HelpCircle size={28} className="text-brand-orange" style={{ color: 'var(--brand-orange)' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-navy)', margin: 0 }}>
              Looking for quick answers?
            </h3>
          </div>
          <p style={{ color: 'var(--text-body)', marginBottom: '1.5rem', maxWidth: '540px', margin: '0.5rem auto 1.5rem' }}>
            Check our comprehensive FAQ section for instant answers on eligibility, repayment, limits, and security.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/faqs" className="btn-hero-secondary">
              <span>View Frequently Asked Questions</span>
              <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => navigate('/apply')}
            >
              <span>Apply Now</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SupportPage;
