import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageCircle, MessageSquare, Phone, Mail, MapPin, Clock, HelpCircle, ShieldCheck, ArrowRight,
  Send, CheckCircle, AlertCircle
} from 'lucide-react';
import { useSupportSettings } from '../lib/supportSettings';

/* Phone Normalization Helper */
const normalizeKenyanPhone = (raw: string): string | null => {
  const clean = raw.replace(/\D/g, '');
  if (clean.length === 10 && (clean.startsWith('07') || clean.startsWith('01'))) {
    return '254' + clean.slice(1);
  }
  if (clean.length === 12 && clean.startsWith('254')) {
    return clean;
  }
  if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
    return '254' + clean;
  }
  return null;
};

export const SupportPage: React.FC<{ onOpenSupport?: () => void }> = () => {
  const navigate = useNavigate();
  const supportSettings = useSupportSettings();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Loan Inquiry');
  const [message, setMessage] = useState('');

  // UI Flow States
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; msg?: string }>({});
  const [submitError, setSubmitError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);

  const whatsappCleanNumber = (supportSettings.supportWhatsapp || '').replace(/\D/g, '');
  const whatsappUrl = whatsappCleanNumber ? `https://wa.me/${whatsappCleanNumber}` : '#';

  const validateForm = () => {
    const errs: { name?: string; phone?: string; email?: string; msg?: string } = {};
    if (!fullName.trim()) errs.name = 'Full name is required';
    if (!phoneNumber.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!normalizeKenyanPhone(phoneNumber)) {
      errs.phone = 'Enter a valid Kenyan phone number (e.g. 0712345678)';
    }
    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!message.trim()) {
      errs.msg = 'Please describe your inquiry';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const normalizedPhone = normalizeKenyanPhone(phoneNumber) || phoneNumber;
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: normalizedPhone,
          customerName: fullName.trim(),
          customerEmail: email.trim() || undefined,
          subject,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.ticket) {
        setSubmittedTicket(data.ticket);
        localStorage.setItem('bl_chat_conversationId', data.ticket.id);
        localStorage.setItem('bl_chat_guestName', fullName.trim());
        localStorage.setItem('bl_chat_guestPhone', normalizedPhone);
      } else {
        setSubmitError(data.message || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err) {
      setSubmitError('Connection failed. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setMessage('');
    setErrors({});
  };

  return (
    <div className="support-page py-12">
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Header / Hero Section */}
        <div className="section-title-wrap text-center" style={{ marginBottom: '2.5rem' }}>
          <span className="sub-tag">24/7 CUSTOMER SUPPORT</span>
          <h1 className="section-heading">How Can We Help You?</h1>
          <p className="section-subheading" style={{ maxWidth: '640px', margin: '0 auto' }}>
            Our support team is available to assist you with loan applications, account access, payments, and general inquiries.
          </p>
        </div>

        {/* Support Availability Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '0.6rem 1.25rem',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '9999px',
            maxWidth: '380px',
            margin: '0 auto 2rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#047857',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
            }}
          />
          <span>Online · Support Team Available 24/7</span>
        </div>

        {/* Live Support Form Card */}
        <div className="apply-step-card" style={{ marginBottom: '3.5rem' }}>
          {!submittedTicket ? (
            <div>
              {/* Card Title Header */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <MessageCircle size={22} style={{ color: 'var(--brand-orange)' }} />
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--brand-navy)', margin: 0 }}>
                    Start a Conversation
                  </h2>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  Send us a message and our support team will get back to you as soon as possible.
                </p>
              </div>

              {submitError && (
                <div className="jijenge-alert jijenge-alert-error" style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                  {/* Full Name */}
                  <div className="form-group">
                    <label htmlFor="support-name" className="jijenge-label">
                      Full Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="support-name"
                      type="text"
                      placeholder="Enter Full Official Name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                      }}
                      className={`jijenge-input ${errors.name ? 'jijenge-input-error' : ''}`}
                      required
                    />
                    {errors.name && <span className="form-field-error">{errors.name}</span>}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group">
                    <label htmlFor="support-phone" className="jijenge-label">
                      M-Pesa Phone Number <span className="required-star">*</span>
                    </label>
                    <input
                      id="support-phone"
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                      }}
                      className={`jijenge-input ${errors.phone ? 'jijenge-input-error' : ''}`}
                      required
                    />
                    {errors.phone && <span className="form-field-error">{errors.phone}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="support-email" className="jijenge-label">
                      Email Address <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      id="support-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                      }}
                      className={`jijenge-input ${errors.email ? 'jijenge-input-error' : ''}`}
                    />
                    {errors.email && <span className="form-field-error">{errors.email}</span>}
                  </div>

                  {/* Inquiry Subject */}
                  <div className="form-group">
                    <label htmlFor="support-subject" className="jijenge-label">
                      Inquiry Subject <span className="required-star">*</span>
                    </label>
                    <select
                      id="support-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="jijenge-select"
                    >
                      <option value="General Loan Inquiry">General Loan Inquiry</option>
                      <option value="Loan Application Assistance">Loan Application Assistance</option>
                      <option value="Account Login Support">Account Login Support</option>
                      <option value="PIN / Account Access">PIN / Account Access</option>
                      <option value="Payment Inquiry">Payment Inquiry</option>
                      <option value="Withdrawal Assistance">Withdrawal Assistance</option>
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label htmlFor="support-message" className="jijenge-label">
                    Your Message <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="support-message"
                    rows={5}
                    placeholder="Tell us how we can help you..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (errors.msg) setErrors((p) => ({ ...p, msg: undefined }));
                    }}
                    className={`jijenge-input ${errors.msg ? 'jijenge-input-error' : ''}`}
                    style={{
                      height: 'auto',
                      minHeight: '140px',
                      padding: '0.85rem 1rem',
                      resize: 'vertical',
                    }}
                    required
                  />
                  {errors.msg && <span className="form-field-error">{errors.msg}</span>}
                </div>

                {/* Submit Button */}
                <div className="form-bottom-actions" style={{ marginTop: '0', paddingTop: '1.25rem' }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>{submitting ? 'Submitting Conversation...' : 'Start Conversation'}</span>
                    {!submitting && <Send size={18} aria-hidden="true" />}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: '0.5rem' }}>
                Conversation Started!
              </h2>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-body)', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem' }}>
                Thank you, <strong>{fullName}</strong>. Your ticket reference is <strong>#{submittedTicket.id}</strong>. Our support team has received your message and will respond to <strong>{phoneNumber}</strong> shortly.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetForm}
                style={{ margin: '0 auto', display: 'inline-flex' }}
              >
                Send Another Message
              </button>
            </div>
          )}
        </div>

        {/* Support Information Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '3.5rem',
          }}
        >
          {/* Card 1: Phone */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="trust-icon-box">
              <Phone size={22} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Phone Support</h3>
            <a
              href={`tel:${(supportSettings.supportPhone || '').replace(/\s+/g, '')}`}
              style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-navy)', textDecoration: 'none', marginBottom: '0.25rem' }}
            >
              {supportSettings.supportPhone}
            </a>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 'auto' }}>
              <Clock size={14} />
              <span>{supportSettings.supportHours}</span>
            </div>
          </div>

          {/* Card 2: Email */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="trust-icon-box">
              <Mail size={22} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Email Customer Care</h3>
            <a
              href={`mailto:${supportSettings.supportEmail}`}
              style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-orange)', textDecoration: 'none', marginBottom: '0.25rem', wordBreak: 'break-all' }}
            >
              {supportSettings.supportEmail}
            </a>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
              Average response time: &lt; 2 hours
            </div>
          </div>

          {/* Card 3: WhatsApp Support */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="trust-icon-box" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <MessageSquare size={22} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>WhatsApp Support</h3>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803D', textDecoration: 'none', marginBottom: '0.25rem' }}
            >
              Chat on WhatsApp ↗
            </a>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
              Instant live chat assistance
            </div>
          </div>

          {/* Card 4: Location */}
          <div className="trust-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="trust-icon-box">
              <MapPin size={22} strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Headquarters</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: '0 0 0.5rem' }}>
              {supportSettings.headquartersAddress}
            </p>
            <div style={{ fontSize: '0.78rem', color: 'var(--brand-navy)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 'auto' }}>
              <ShieldCheck size={15} style={{ color: 'var(--brand-emerald)' }} />
              <span>CBK Licensed &amp; ODPC Protected</span>
            </div>
          </div>
        </div>

        {/* Quick FAQ Link Banner */}
        <div className="tab-cta-box" style={{ background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <HelpCircle size={28} style={{ color: 'var(--brand-orange)' }} />
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
