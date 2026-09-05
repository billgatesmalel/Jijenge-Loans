import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ShieldCheck, Lock, ExternalLink } from 'lucide-react';

interface FooterProps {
  onOpenSupport?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-grid">

        {/* Col 1: Brand */}
        <div className="footer-col footer-col--brand">
          <div className="footer-brand-wrap">
            <img
              src="/logo.png"
              alt="Jijenge Loans"
              className="footer-logo-icon"
              width="36"
              height="36"
              loading="lazy"
            />
            <div className="footer-brand-text">
              <span className="footer-brand-title">Jijenge Loans</span>
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
          <nav aria-label="Footer quick links navigation">
            <ul className="footer-nav-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/apply">Apply for a Loan</Link></li>
              <li><Link to="/faqs">FAQs</Link></li>
            </ul>
          </nav>
        </div>

        {/* Col 3: Customer Services */}
        <div className="footer-col">
          <h3 className="footer-col-title">Customer Services</h3>
          <nav aria-label="Footer customer services navigation">
            <ul className="footer-nav-list">
              <li>
                <Link to="/customer">
                  Customer Login
                </Link>
              </li>
              <li>
                <Link to="/track-loan">
                  Track Application
                </Link>
              </li>
              {onOpenSupport && (
                <li>
                  <button
                    type="button"
                    className="footer-nav-btn"
                    onClick={onOpenSupport}
                  >
                    Live Support Chat
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>

        {/* Col 4: Legal */}
        <div className="footer-col">
          <h3 className="footer-col-title">Legal</h3>
          <ul className="footer-nav-list">
            <li>
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
                <ExternalLink size={11} aria-hidden="true" style={{ marginLeft: '4px', display: 'inline', verticalAlign: 'middle' }} />
              </a>
            </li>
            <li>
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms &amp; Conditions
                <ExternalLink size={11} aria-hidden="true" style={{ marginLeft: '4px', display: 'inline', verticalAlign: 'middle' }} />
              </a>
            </li>
            <li>
              <a href="https://www.centralbank.go.ke" target="_blank" rel="noopener noreferrer">
                CBK License
                <ExternalLink size={11} aria-hidden="true" style={{ marginLeft: '4px', display: 'inline', verticalAlign: 'middle' }} />
              </a>
            </li>
          </ul>
        </div>

        {/* Col 5: Contact */}
        <div className="footer-col">
          <h3 className="footer-col-title">Contact Us</h3>
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
          <p className="footer-hours">Mon – Sat&nbsp;|&nbsp;8 AM – 8 PM EAT</p>
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

export default Footer;
