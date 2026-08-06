import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, Lock } from 'lucide-react';

interface FooterProps {
  onTabChange: (tabId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onTabChange }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-grid">

        {/* Col 1: Brand */}
        <div className="footer-col footer-col--brand">
          <div className="footer-brand-wrap">
            <img
              src="/favicon.svg"
              alt=""
              className="footer-logo-icon"
              width="32"
              height="32"
              loading="lazy"
            />
            <div className="footer-brand-text">
              <span className="footer-brand-title">Jijenge Loans</span>
              <span className="footer-brand-tagline">Fast Business Funding</span>
            </div>
          </div>
          <p className="footer-desc">
            Fast, collateral-free business loans approved daily for Kenyan entrepreneurs.
            Powered by digital credit scoring.
          </p>
          <div className="footer-compliance-badges">
            <span className="footer-badge">
              <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" />
              CBK Licensed
            </span>
            <span className="footer-badge">
              <Lock size={13} strokeWidth={2} aria-hidden="true" />
              ODPC Certified
            </span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="footer-col">
          <h3 className="footer-col-title">Quick Links</h3>
          <nav aria-label="Footer navigation">
            <ul className="footer-nav-list">
              <li><a href="#home" onClick={() => onTabChange('home')}>Home</a></li>
              <li><a href="#how-it-works" onClick={() => onTabChange('how-it-works')}>How It Works</a></li>
              <li><a href="#apply" onClick={() => onTabChange('apply')}>Apply for a Loan</a></li>
              <li><a href="#faqs" onClick={() => onTabChange('faqs')}>FAQs</a></li>
              <li><a href="#track">Track Your Loan</a></li>
            </ul>
          </nav>
        </div>

        {/* Col 3: Contact */}
        <div className="footer-col">
          <h3 className="footer-col-title">Contact Support</h3>
          <ul className="footer-contact-list">
            <li>
              <Phone size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>+254 700 123 456</span>
            </li>
            <li>
              <Mail size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>support@jijengeloans.co.ke</span>
            </li>
            <li>
              <MapPin size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>Nairobi, Kenya</span>
            </li>
          </ul>
          <p className="footer-hours">Mon – Sat &nbsp;|&nbsp; 8 AM – 8 PM EAT</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p className="footer-copy">
            &copy; {year} Jijenge Loans Ltd. All Rights Reserved. Licensed by the Central Bank of Kenya (CBK).
          </p>
          <p className="footer-legal">
            All transactions are secured with 256-bit SSL encryption. Data protected under Kenya's Data Protection Act 2019.
          </p>
        </div>
      </div>
    </footer>
  );
};
