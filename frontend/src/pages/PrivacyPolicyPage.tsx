import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle, ArrowRight } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="privacy-page py-12">
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Header */}
        <div className="section-title-wrap text-center" style={{ marginBottom: '3rem' }}>
          <span className="sub-tag">ODPC &amp; CBK Compliant</span>
          <h1 className="section-heading">Privacy Policy</h1>
          <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
            Jijenge Loans Ltd is committed to protecting your personal data in compliance with Kenya's Data Protection Act 2019 and Central Bank regulations.
          </p>
        </div>

        {/* Content Box */}
        <div className="apply-step-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <ShieldCheck size={24} style={{ color: 'var(--brand-emerald)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--brand-navy)', fontWeight: 700 }}>
              Official Data Controller Registration: ODPC/REG/2024/0912
            </div>
          </div>

          {/* Section 1 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              1. Information We Collect
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              When you apply for a business loan with Jijenge Loans, we collect personal and financial information necessary to assess your creditworthiness. This includes your full legal name, National ID number, age, M-Pesa phone number, gender, marital status, business category, county location, and estimated monthly income.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              2. How We Use Your Personal Data
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-body)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand-emerald)', marginTop: '3px', flexShrink: 0 }} />
                <span>To evaluate your credit application using automated scoring models under CBK guidelines.</span>
              </li>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-body)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand-emerald)', marginTop: '3px', flexShrink: 0 }} />
                <span>To disburse approved loan funds directly to your registered M-Pesa phone line.</span>
              </li>
              <li style={{ fontSize: '0.9rem', color: 'var(--text-body)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--brand-emerald)', marginTop: '3px', flexShrink: 0 }} />
                <span>To send repayment reminders, transaction receipts, and customer service updates.</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              3. Data Security &amp; Encryption
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              All data transmitted through Jijenge Loans is secured using industry-standard 256-bit SSL encryption. We maintain strict organizational and technical measures to prevent unauthorized access, alteration, disclosure, or destruction of your personal data.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              4. Third-Party Sharing &amp; Credit Bureaus
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
              We do not sell, rent, or trade your personal data. We only share relevant credit information with licensed Credit Reference Bureaus (CRBs) and financial transaction processors as required by Kenyan law and Central Bank of Kenya (CBK) regulations.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
              5. Your Privacy Rights &amp; Contacts
            </h2>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Under the Data Protection Act 2019, you have the right to request access to, correction of, or deletion of your personal data held by Jijenge Loans. For privacy inquiries, please contact our Data Protection Officer at:
            </p>
            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)', fontSize: '0.9rem', color: 'var(--brand-navy)', fontWeight: 700 }}>
              Email: privacy@jijengeloans.co.ke | Phone: +254 700 123 456
            </div>
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

export default PrivacyPolicyPage;
