import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, ArrowRight } from 'lucide-react';

interface FaqCategory {
  category: string;
  items: { q: string; a: string }[];
}

export const FaqsPage: React.FC = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<string | null>('0-0');

  const faqCategories: FaqCategory[] = [
    {
      category: 'General Questions',
      items: [
        {
          q: 'What is Jijenge Loans?',
          a: 'Jijenge Loans is a licensed digital lender in Kenya providing fast, collateral-free business financing from Ksh 5,000 to Ksh 100,000 directly to M-Pesa accounts.',
        },
        {
          q: 'Who can apply for a loan?',
          a: 'Any Kenyan citizen aged 18 years or older with a valid National ID and an active M-Pesa line used for personal or business transactions can apply.',
        },
      ],
    },
    {
      category: 'Loan Applications',
      items: [
        {
          q: 'How do I apply?',
          a: 'Simply click "Apply Now", fill out your basic personal and business details online in under 2 minutes, and submit your application. No physical paperwork needed.',
        },
        {
          q: 'How long does an application take to evaluate?',
          a: 'Our credit scoring system evaluates applications in real-time. Approved funds hit your M-Pesa line in under 15 minutes, 24/7.',
        },
      ],
    },
    {
      category: 'Loan Limits & Eligibility',
      items: [
        {
          q: 'What loan amounts are available?',
          a: 'First-time borrowers can qualify for Ksh 5,000 up to Ksh 30,000. As you repay on time, your limit increases up to Ksh 100,000.',
        },
        {
          q: 'How is my loan limit determined?',
          a: 'Eligibility is calculated automatically using digital credit scoring algorithms based on transaction history and credit repayment patterns.',
        },
      ],
    },
    {
      category: 'Loan Repayment',
      items: [
        {
          q: 'How does repayment work?',
          a: 'Repayment is easy via our M-Pesa Paybill number or using automated STK Push prompts sent directly to your phone on or before your due date.',
        },
        {
          q: 'What happens after loan approval?',
          a: 'Funds are immediately queued for M-Pesa disbursal. You will receive an SMS confirmation containing your loan receipt and repayment schedule.',
        },
      ],
    },
    {
      category: 'Security & Privacy',
      items: [
        {
          q: 'Is my personal & financial information secure?',
          a: 'Yes. All data transmissions are encrypted using 256-bit SSL encryption. Jijenge Loans is fully licensed by the Central Bank of Kenya (CBK) and compliant with the Data Protection Act 2019 (ODPC).',
        },
        {
          q: 'How is customer data protected?',
          a: 'We never share your personal data with third parties without your explicit consent, and strict access controls are maintained in compliance with ODPC standards.',
        },
      ],
    },
  ];

  const toggleItem = (key: string) => {
    setOpenIndex(prev => (prev === key ? null : key));
  };

  return (
    <div className="faqs-page py-12">
      <div className="container">
        
        {/* Header */}
        <div className="section-title-wrap text-center" style={{ marginBottom: '3rem' }}>
          <span className="sub-tag">Got Questions?</span>
          <h1 className="section-heading">Frequently Asked Questions</h1>
          <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
            Find answers to common questions about Jijenge Loans applications, eligibility, security, and M-Pesa payouts.
          </p>
        </div>

        {/* Categorized FAQs */}
        <div style={{ maxWidth: '840px', margin: '0 auto 3.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {faqCategories.map((cat, catIdx) => (
            <div key={cat.category}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '1rem', borderBottom: '2px solid var(--brand-orange-light)', paddingBottom: '0.5rem' }}>
                {cat.category}
              </h2>
              <div className="faq-accordion" style={{ margin: 0 }}>
                {cat.items.map((item, itemIdx) => {
                  const key = `${catIdx}-${itemIdx}`;
                  const isOpen = openIndex === key;
                  return (
                    <div key={item.q} className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => toggleItem(key)}
                        aria-expanded={isOpen}
                      >
                        <span className="faq-question-text">{item.q}</span>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {isOpen && (
                        <div className="faq-answer-content">
                          <p>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="tab-cta-box" style={{ background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2.5rem 2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.5rem' }}>
            Still have questions or ready to apply?
          </h3>
          <p style={{ color: 'var(--text-body)', marginBottom: '1.5rem' }}>
            Get funded in under 15 minutes or reach out to our dedicated support team.
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
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate('/support')}
            >
              <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
              <span>Contact Support</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FaqsPage;
