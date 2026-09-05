import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="terms-page py-12">
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Header */}
        <div className="section-title-wrap text-center" style={{ marginBottom: '3rem' }}>
          <span className="sub-tag">Borrower Agreement</span>
          <h1 className="section-heading">Terms &amp; Conditions</h1>
          <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
            Please read these terms and conditions carefully before submitting a loan application with Jijenge Loans Ltd.
          </p>
        </div>

        {/* Content Box */}
        <div className="apply-step-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: '#FFF5ED', border: '1px solid #FFD6B3', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <ShieldCheck size={24} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--brand-navy)', fontWeight: 700 }}>
              CBK Digital Credit Provider License Compliance Rules Apply
            </div>
          </div>

          {/* Section 1 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              1. Eligibility Criteria
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              To qualify for a business loan from Jijenge Loans, you must be a Kenyan citizen residing in Kenya, aged 18 years or older, possessing a valid National Identity Card and an active M-Pesa line registered in your name.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              2. Loan Limits, Rates &amp; Verification Fees
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              Loan limits range from KES 5,000 to KES 100,000 based on automated credit assessment. A mandatory upfront verification/processing fee is required upon assessment approval to activate and disburse allocated funds.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>Micro Booster (KES 15,000) — 30 Days Repayment</span>
              </li>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>Business Flex (KES 35,000) — 45 Days Repayment</span>
              </li>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>Trade Prime (KES 60,000) — 60 Days Repayment</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              3. Disbursal &amp; Repayment Schedule
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              Upon successful payment of the verification fee, loan capital is disbursed directly to your M-Pesa account within 15 minutes. Repayment is due strictly according to your selected tenure via M-Pesa Paybill or automated STK prompts.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              4. Default &amp; Credit Bureau Reporting
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              Late payments beyond the agreed tenure may attract late payment charges allowed under Central Bank rules. Continued non-payment will result in negative reporting to licensed Credit Reference Bureaus (Metropol, TransUnion, CreditInfo).
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              5. Governing Law
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              These Terms and Conditions shall be governed by and construed in accordance with the Laws of the Republic of Kenya. Any legal disputes shall be handled under the jurisdiction of Kenyan Courts.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <Link to="/apply" className="btn-hero-primary">
            <span>Apply For Business Loan</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default TermsPage;
