import React from 'react';

interface FooterProps {
  onTabChange: (tabId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onTabChange }) => {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <div className="brand-logo-pill">BL</div>
          <span className="brand-title">Jijenge Loans</span>
        </div>
        <p className="footer-desc">
          Fast, collateral-free business loans approved daily across Kenya. Licensed by Central Bank of Kenya (CBK).
        </p>

        <div className="footer-links">
          <a href="#home" onClick={() => onTabChange('home')}>Home</a>
          <a href="#how-it-works" onClick={() => onTabChange('how-it-works')}>How It Works</a>
          <a href="#apply" onClick={() => onTabChange('apply')}>Fill Application Details</a>
          <a href="#faqs" onClick={() => onTabChange('faqs')}>FAQs</a>
        </div>

        <p className="footer-copy">&copy; 2026 Jijenge Loans Ltd. All Rights Reserved. Licensed by CBK.</p>
      </div>
    </footer>
  );
};
