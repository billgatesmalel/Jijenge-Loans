import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, ShieldCheck, Zap, Smartphone, CheckCircle, Wallet } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      num: 1,
      title: 'Apply Online',
      desc: 'Select your business category, choose your loan amount from Ksh 5,000 to Ksh 100,000, and submit your personal & business details in under 2 minutes.',
      Icon: Smartphone,
    },
    {
      num: 2,
      title: 'Automated Application Review',
      desc: 'Our credit scoring algorithm instantly evaluates your digital credit history without requiring physical documents or branch visits.',
      Icon: Zap,
    },
    {
      num: 3,
      title: 'Instant Loan Approval',
      desc: 'Get immediate confirmation of your approved loan limit, repayment terms, and clear schedule with zero hidden fees.',
      Icon: CheckCircle,
    },
    {
      num: 4,
      title: 'Complete Processing Steps',
      desc: 'Verify your M-Pesa phone number via a quick OTP code to authorize disbursal to your registered line.',
      Icon: ShieldCheck,
    },
    {
      num: 5,
      title: 'Receive Funds on M-Pesa',
      desc: 'Approved capital is disbursed directly to your M-Pesa account in under 15 minutes — 24 hours a day, 7 days a week.',
      Icon: Wallet,
    },
  ];

  return (
    <div className="how-it-works-page py-12">
      <div className="container">
        
        {/* Header */}
        <div className="section-title-wrap text-center" style={{ marginBottom: '3rem' }}>
          <span className="sub-tag">Transparent Process</span>
          <h1 className="section-heading">How Jijenge Loans Works</h1>
          <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
            5 simple steps to get collateral-free funding disbursed directly to your M-Pesa account in minutes.
          </p>
        </div>

        {/* Stepper Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '860px', margin: '0 auto 3.5rem' }}>
          {steps.map(step => {
            const StepIcon = step.Icon;
            return (
              <div
                key={step.num}
                className="trust-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.25rem',
                  padding: '1.75rem',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--brand-orange)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <StepIcon size={20} style={{ color: 'var(--brand-orange)' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--brand-navy)' }}>
                      {step.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="tab-cta-box" style={{ background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
            Ready to grow your business today?
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-body)', marginBottom: '1.75rem', maxWidth: '560px', margin: '0 auto 1.75rem' }}>
            Join over 50,000 Kenyan entrepreneurs who trust Jijenge Loans for fast, reliable funding.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => navigate('/apply')}
            >
              <span>Apply Now</span>
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <Link
              to="/track-loan"
              className="btn-hero-secondary"
            >
              <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />
              <span>Track Your Application</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HowItWorksPage;
