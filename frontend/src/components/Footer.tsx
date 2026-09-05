import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ShieldCheck, Lock, ExternalLink, MessageSquare } from 'lucide-react';
import { useSupportSettings } from '../lib/supportSettings';

interface FooterProps {
  onOpenSupport?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  const year = new Date().getFullYear();
  const supportSettings = useSupportSettings();

  const whatsappCleanNumber = (supportSettings.supportWhatsapp || '').replace(/\D/g, '');
  const whatsappUrl = whatsappCleanNumber ? `https://wa.me/${whatsappCleanNumber}` : '#';

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
        <div className="footer-col footer-col--quick-links">
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
        <div className="footer-col footer-col--services">
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
              <li>
                <Link to="/support">
                  Support Centre
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
        <div className="footer-col footer-col--legal">
          <h3 className="footer-col-title">LEGAL</h3>
          <nav aria-label="Footer legal navigation">
            <ul className="footer-nav-list">
              <li>
                <Link to="/privacy-policy" className="footer-legal-link">
                  <span>Privacy Policy</span>
                  <ExternalLink size={13} className="footer-link-icon" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/terms" className="footer-legal-link">
                  <span>Terms &amp; Conditions</span>
                  <ExternalLink size={13} className="footer-link-icon" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <a
                  href="https://www.centralbank.go.ke"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-legal-link"
                >
                  <span>CBK License</span>
                  <ExternalLink size={13} className="footer-link-icon" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Col 5: Contact */}
        <div className="footer-col footer-col--contact">
          <h3 className="footer-col-title">Contact Us</h3>
          <ul className="footer-contact-list">
            <li>
              <Phone size={14} strokeWidth={1.8} aria-hidden="true" />
              <a href={`tel:${(supportSettings.supportPhone || '').replace(/\s+/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {supportSettings.supportPhone}
              </a>
            </li>
            <li>
              <Mail size={14} strokeWidth={1.8} aria-hidden="true" />
              <a href={`mailto:${supportSettings.supportEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {supportSettings.supportEmail}
              </a>
            </li>
            <li>
              <MessageSquare size={14} strokeWidth={1.8} style={{ color: '#22c55e' }} aria-hidden="true" />
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>
                WhatsApp Support ↗
              </a>
            </li>
            <li>
              <MapPin size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>{supportSettings.headquartersAddress}</span>
            </li>
          </ul>
          <p className="footer-hours">{supportSettings.supportHours}</p>
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
