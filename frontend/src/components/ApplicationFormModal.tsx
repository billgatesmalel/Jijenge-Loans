import React, { useState } from 'react';
import { calculateProcessingFee } from '../lib/shared';

interface ApplicationFormModalProps {
  onTabChange: (tabId: string) => void;
}

/* Helper for normalizing Kenyan M-Pesa phone numbers */
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

/* Helper for National ID validation */
const isValidNationalId = (val: string): boolean => {
  const clean = val.replace(/\D/g, '');
  return clean.length >= 6 && clean.length <= 9;
};

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({ onTabChange }) => {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [county, setCounty] = useState('');
  const [townArea, setTownArea] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  // Inline Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Flow states
  const [showAssessmentLoader, setShowAssessmentLoader] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(1);
  const [progressFill, setProgressFill] = useState(0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState(1); // 1: Offer, 2: Payment, 3: Success

  // Loan detail responses
  const [loanOffer, setLoanOffer] = useState<any>(null);

  // Payment integration
  const [stkLoading, setStkLoading] = useState(false);
  const [stkMessage, setStkMessage] = useState('');
  const [stkError, setStkError] = useState('');

  // Auto-calculated fields based on monthly income mapping
  const getMappedPackageDetails = (incomeValue: string) => {
    switch (incomeValue) {
      case '15000:30000':
        return { name: 'Jijenge Micro Booster', amount: 15000, tenure: 30 };
      case '30001:60000':
        return { name: 'Jijenge Business Flex', amount: 35000, tenure: 45 };
      case '60001:100000':
        return { name: 'Jijenge Trade Prime', amount: 60000, tenure: 60 };
      case '100001:1000000':
        return { name: 'Jijenge Enterprise Express', amount: 120000, tenure: 90 };
      default:
        return { name: 'Jijenge Micro Booster', amount: 15000, tenure: 30 };
    }
  };

  const selectedPkg = getMappedPackageDetails(monthlyIncome);
  const processingFee = calculateProcessingFee(selectedPkg.amount);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      errs.fullName = 'Please enter your full official name.';
    }

    if (!isValidNationalId(nationalId)) {
      errs.nationalId = 'Enter a valid National ID number (6 to 9 digits).';
    }

    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 90) {
      errs.age = 'Age must be between 18 and 90 years.';
    }

    const normPhone = normalizeKenyanPhone(phoneNumber);
    if (!phoneNumber.trim() || !normPhone) {
      errs.phoneNumber = 'Enter a valid M-Pesa phone number (e.g. 0712345678 or 254712345678).';
    }

    if (!gender) {
      errs.gender = 'Please select your gender.';
    }

    if (!maritalStatus) {
      errs.maritalStatus = 'Please select your marital status.';
    }

    if (!businessType) {
      errs.businessType = 'Please select a business category.';
    }

    if (!county.trim()) {
      errs.county = 'County is required.';
    }

    if (!townArea.trim()) {
      errs.townArea = 'Town or Area is required.';
    }

    if (!monthlyIncome) {
      errs.monthlyIncome = 'Please select your monthly income range.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return; // Prevent double clicks

    if (!validateForm()) {
      // Scroll to top of form card smoothly to see first error
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    const normPhone = normalizeKenyanPhone(phoneNumber) || phoneNumber.trim();

    setSubmitting(true);
    setShowAssessmentLoader(true);
    setProgressFill(0);
    setAssessmentStep(1);

    const stepInterval = setInterval(() => {
      setAssessmentStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 600);

    const progressInterval = setInterval(() => {
      setProgressFill((prev) => (prev < 100 ? prev + 10 : 100));
    }, 300);

    try {
      const payload = {
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        age: parseInt(age, 10),
        gender,
        maritalStatus,
        phoneNumber: normPhone,
        businessType,
        county: county.trim(),
        townArea: townArea.trim(),
        monthlyIncome,
        amount: selectedPkg.amount,
        packageName: selectedPkg.name,
        tenureDays: selectedPkg.tenure,
      };

      const res = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.loan) {
        setLoanOffer(data.loan);
      } else {
        alert(data.message || 'Verification failed. Please review your details.');
        setShowAssessmentLoader(false);
        setSubmitting(false);
        clearInterval(stepInterval);
        clearInterval(progressInterval);
        return;
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Connection error. Failed to submit application.');
      setShowAssessmentLoader(false);
      setSubmitting(false);
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      return;
    }

    // Complete assessment loader after 3 seconds
    setTimeout(() => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setShowAssessmentLoader(false);
      setSubmitting(false);
      setCheckoutOpen(true);
      setCheckoutStage(1);
    }, 3000);
  };

  // Payment triggers STK Push
  const sendStkPush = async () => {
    if (!loanOffer) return;
    setStkLoading(true);
    setStkMessage('');
    setStkError('');

    try {
      const res = await fetch('/api/payments/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef: loanOffer.transactionRef,
          phoneNumber: loanOffer.phoneNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStkMessage(data.message || 'STK push prompt sent. Enter your M-Pesa PIN on your phone.');
        startPollingForPayment();
      } else {
        setStkError(data.message || 'STK Push trigger failed. Please check phone number and try again.');
        setStkLoading(false);
      }
    } catch (err) {
      setStkError('Connection error. Failed to send STK push prompt.');
      setStkLoading(false);
    }
  };

  // Poll for payment success
  const startPollingForPayment = () => {
    if (!loanOffer) return;
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/loans/track/${loanOffer.transactionRef}`);
        const data = await res.json();
        if (data.success && data.loan) {
          if (data.loan.feeStatus === 'Paid') {
            clearInterval(intervalId);
            setCheckoutStage(3);
            setStkLoading(false);
          }
        }
      } catch (err) {
        console.error('Payment polling error:', err);
      }
    }, 3000);

    // Timeout polling after 60 seconds
    setTimeout(() => {
      clearInterval(intervalId);
      if (stkLoading) {
        setStkError('Verification payment timed out. If you have paid, please go to Track Loan to check progress.');
        setStkLoading(false);
      }
    }, 60000);
  };

  return (
    <div className="container">
      <div className="section-title-wrap text-center">
        <span className="sub-tag">100% Digital Application</span>
        <h2 className="section-heading">Fill Loan Application Details</h2>
        <p className="section-subheading">
          Complete your details below to receive instant collateral-free funding directly to your M-Pesa line.
        </p>
      </div>

      <div className="application-form-wrapper">
        {/* Step Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#FF6600' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#FF6600', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
            <span>Personal</span>
          </div>
          <div style={{ flex: 1, height: 2, background: '#cbd5e1', margin: '0 0.75rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
            <span>Business</span>
          </div>
          <div style={{ flex: 1, height: 2, background: '#cbd5e1', margin: '0 0.75rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</span>
            <span>Assessment</span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} noValidate>
          {/* Section 1: Personal Details */}
          <div className="form-section">
            <h3 className="form-section-title">
              <span className="section-icon-badge">👤</span>
              <span>1. Personal Information</span>
            </h3>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="full-name">Full Name (As shown on ID) *</label>
                <input
                  id="full-name"
                  type="text"
                  placeholder="Enter Full Name"
                  value={fullName}
                  className={formErrors.fullName ? 'input-error' : ''}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (formErrors.fullName) setFormErrors((p) => ({ ...p, fullName: '' }));
                  }}
                  required
                />
                {formErrors.fullName && <span className="form-field-error">{formErrors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="national-id">National ID Number *</label>
                <input
                  id="national-id"
                  type="text"
                  placeholder="Enter National ID"
                  value={nationalId}
                  className={formErrors.nationalId ? 'input-error' : ''}
                  onChange={(e) => {
                    setNationalId(e.target.value);
                    if (formErrors.nationalId) setFormErrors((p) => ({ ...p, nationalId: '' }));
                  }}
                  required
                />
                {formErrors.nationalId && <span className="form-field-error">{formErrors.nationalId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="applicant-age">Age (Years) *</label>
                <input
                  id="applicant-age"
                  type="number"
                  placeholder="Age (18+)"
                  min="18"
                  max="90"
                  value={age}
                  className={formErrors.age ? 'input-error' : ''}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (formErrors.age) setFormErrors((p) => ({ ...p, age: '' }));
                  }}
                  required
                />
                {formErrors.age && <span className="form-field-error">{formErrors.age}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone-number">Phone Number (M-Pesa Line) *</label>
                <input
                  id="phone-number"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={phoneNumber}
                  className={formErrors.phoneNumber ? 'input-error' : ''}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (formErrors.phoneNumber) setFormErrors((p) => ({ ...p, phoneNumber: '' }));
                  }}
                  required
                />
                {formErrors.phoneNumber && <span className="form-field-error">{formErrors.phoneNumber}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="applicant-gender">Gender *</label>
                <select
                  id="applicant-gender"
                  value={gender}
                  className={formErrors.gender ? 'input-error' : ''}
                  onChange={(e) => {
                    setGender(e.target.value);
                    if (formErrors.gender) setFormErrors((p) => ({ ...p, gender: '' }));
                  }}
                  required
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {formErrors.gender && <span className="form-field-error">{formErrors.gender}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="marital-status">Marital Status *</label>
                <select
                  id="marital-status"
                  value={maritalStatus}
                  className={formErrors.maritalStatus ? 'input-error' : ''}
                  onChange={(e) => {
                    setMaritalStatus(e.target.value);
                    if (formErrors.maritalStatus) setFormErrors((p) => ({ ...p, maritalStatus: '' }));
                  }}
                  required
                >
                  <option value="" disabled>Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
                {formErrors.maritalStatus && <span className="form-field-error">{formErrors.maritalStatus}</span>}
              </div>
            </div>
          </div>

          {/* Section 2: Business Information */}
          <div className="form-section">
            <h3 className="form-section-title">
              <span className="section-icon-badge">🏬</span>
              <span>2. Business / Income Information</span>
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="business-type">Business Category *</label>
                <select
                  id="business-type"
                  value={businessType}
                  className={formErrors.businessType ? 'input-error' : ''}
                  onChange={(e) => {
                    setBusinessType(e.target.value);
                    if (formErrors.businessType) setFormErrors((p) => ({ ...p, businessType: '' }));
                  }}
                  required
                >
                  <option value="" disabled>Select Category</option>
                  <option value="Retail & Small Shops">Retail & Small Shops</option>
                  <option value="Agriculture & Farming">Agriculture & Farming</option>
                  <option value="Transport Services">Transport Services</option>
                  <option value="Salon & Beauty Services">Salon & Beauty Services</option>
                  <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                  <option value="Food & Restaurant Vendors">Food & Restaurant Vendors</option>
                  <option value="Other Business">Other Services</option>
                </select>
                {formErrors.businessType && <span className="form-field-error">{formErrors.businessType}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="county-location">County *</label>
                <input
                  id="county-location"
                  type="text"
                  placeholder="Enter County"
                  value={county}
                  className={formErrors.county ? 'input-error' : ''}
                  onChange={(e) => {
                    setCounty(e.target.value);
                    if (formErrors.county) setFormErrors((p) => ({ ...p, county: '' }));
                  }}
                  required
                />
                {formErrors.county && <span className="form-field-error">{formErrors.county}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="town-area">Town / Area *</label>
                <input
                  id="town-area"
                  type="text"
                  placeholder="Enter Town or Area"
                  value={townArea}
                  className={formErrors.townArea ? 'input-error' : ''}
                  onChange={(e) => {
                    setTownArea(e.target.value);
                    if (formErrors.townArea) setFormErrors((p) => ({ ...p, townArea: '' }));
                  }}
                  required
                />
                {formErrors.townArea && <span className="form-field-error">{formErrors.townArea}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="monthly-income">Monthly Income (KES) *</label>
                <select
                  id="monthly-income"
                  value={monthlyIncome}
                  className={formErrors.monthlyIncome ? 'input-error' : ''}
                  onChange={(e) => {
                    setMonthlyIncome(e.target.value);
                    if (formErrors.monthlyIncome) setFormErrors((p) => ({ ...p, monthlyIncome: '' }));
                  }}
                  required
                >
                  <option value="" disabled>Select Monthly Income</option>
                  <option value="15000:30000">Below Ksh 30,000</option>
                  <option value="30001:60000">Ksh 30,000 - Ksh 60,000</option>
                  <option value="60001:100000">Ksh 60,000 - Ksh 100,000</option>
                  <option value="100001:1000000">Above Ksh 100,000</option>
                </select>
                {formErrors.monthlyIncome && <span className="form-field-error">{formErrors.monthlyIncome}</span>}
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="form-bottom-actions">
            <p className="form-disclaimer">
              By continuing, you agree to our Terms & Conditions and Privacy Policy. All credit profiles are verified under Central Bank regulations.
            </p>

            <button type="submit" disabled={submitting} className="btn-cta-large btn-form-submit">
              <span>{submitting ? 'Submitting Application...' : 'Submit Application for Assessment'}</span>
              {!submitting && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 5-Second Professional Loan Assessment Loader Modal */}
      {showAssessmentLoader && (
        <div className="modal-backdrop" id="fetching-loader-modal" style={{ display: 'flex', zIndex: 9999 }}>
          <div className="modal-dialog" style={{ maxWidth: '480px', textAlign: 'center', padding: '2.25rem 1.75rem', background: '#ffffff', borderRadius: '16px' }}>
            <div className="processing-box">
              <div className="spinner-ring" style={{ width: '58px', height: '58px', borderWidth: '5px', borderTopColor: '#FF6600', margin: '0 auto 1.25rem auto' }} />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Assessing Application...</h3>
              <p className="processing-sub" style={{ fontSize: '0.875rem', color: '#FF6600', fontWeight: 700, margin: '0 0 1.25rem 0' }}>
                Verifying your information...
              </p>
              <div className="progress-bar-wrap" style={{ height: '10px', borderRadius: '5px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div className="progress-bar-fill" style={{ width: `${progressFill}%`, background: '#FF6600', height: '100%', transition: 'width 0.8s ease' }} />
              </div>
              <ul className="verification-steps" style={{ marginTop: '1.25rem', fontSize: '0.85rem', textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', listStyle: 'none' }}>
                <li style={{ marginBottom: '0.4rem', color: assessmentStep >= 1 ? '#047857' : '#64748b' }}>{assessmentStep >= 1 ? '✓' : '⏳'} Verifying ID and Identity Records...</li>
                <li style={{ marginBottom: '0.4rem', color: assessmentStep >= 2 ? '#047857' : '#64748b' }}>{assessmentStep >= 2 ? '✓' : '⏳'} Fetching applicant financial details...</li>
                <li style={{ marginBottom: '0.4rem', color assessmentStep >= 3 ? '#047857' : '#64748b' }}>{assessmentStep >= 3 ? '✓' : '⏳'} Assessing credit bureau history...</li>
                <li style={{ marginBottom: '0.4rem', color assessmentStep >= 4 ? '#047857' : '#64748b' }}>{assessmentStep >= 4 ? '✓' : '⏳'} Calculating maximum loan limit...</li>
                <li style={{ color: assessmentStep >= 5 ? '#047857' : '#64748b' }}>{assessmentStep >= 5 ? '✓' : '⏳'} Preparing customized loan package offer...</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Checkout & Verification View Modal */}
      {checkoutOpen && loanOffer && (
        <div className="modal-backdrop" id="apply-modal" style={{ display: 'flex', flexDirection: 'column', zIndex: 999 }}>
          {/* Checkout Header */}
          <header style={{ background: '#0f172a', padding: '1rem 1.75rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.png" alt="Jijenge Loans" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff', letterSpacing: '-0.3px' }}>Jijenge Loans</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(false)}
              style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer' }}
              aria-label="Close offer view"
            >
              ✕
            </button>
          </header>

          <div className="modal-dialog" style={{ flex: 1, padding: '2rem 1.5rem', width: '100%', maxWidth: '680px', margin: '0 auto' }}>
            {/* Stage 1: Matched Offer */}
            {checkoutStage === 1 && (
              <div className="modal-stage active">
                <div className="payment-setup-box" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem 1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <div style={{ background: '#FFF5ED', borderRadius: '14px', padding: '1.5rem 1.25rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid #FFD6B3' }}>
                    <span style={{ background: '#FF6600', color: '#ffffff', fontSize: '0.725rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '0.5rem' }}>Application Submitted Successfully</span>
                    <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Your Loan Application Assessment Result</h2>
                    <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                      Your application has been received and verified against Central Bank credit scoring models. You are matched with the offer below.
                    </p>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>MATCHED LOAN OFFER</span>
                    <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FF6600', margin: 0 }}>KES {(loanOffer.amount || 0).toLocaleString()}</h3>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Assigned Package:</span>
                        <strong style={{ display: 'block', fontSize: '1.1rem', color: '#ffffff' }}>{loanOffer.packageName}</strong>
                      </div>
                      <span style={{ background: 'rgba(255, 102, 0, 0.25)', border: '1px solid #FF6600', color: '#FF6600', fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '20px', alignSelf: 'center' }}>✓ Verified</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.15rem 1.5rem', fontSize: '0.875rem' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Loan Package</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{loanOffer.packageName}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Processing Fee</span>
                        <strong style={{ color: '#FF6600', fontWeight: 800 }}>KES {(loanOffer.processingFee || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Repayment Period</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{loanOffer.tenureDays} Days</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Repayment Cycle</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>Weekly</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-cta-large"
                    onClick={() => setCheckoutStage(2)}
                    style={{ width: '100%', background: '#FF6600', boxShadow: '0 6px 20px rgba(255,102,0,0.28)' }}
                  >
                    Confirm &amp; Proceed to Payment &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Stage 2: Payment */}
            {checkoutStage === 2 && (
              <div className="modal-stage active">
                <div className="payment-setup-box" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem 1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>M-Pesa Verification Payment</h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                      A verification fee of <strong>KES {(loanOffer.processingFee || 0).toLocaleString()}</strong> is required to activate and disburse your matched offer of <strong>KES {(loanOffer.amount || 0).toLocaleString()}</strong>.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                      <li>Ensure your phone is unlocked and active.</li>
                      <li>Click the button below to receive an M-Pesa STK push prompt.</li>
                      <li>Enter your M-Pesa secret PIN to confirm payment.</li>
                      <li>Disbursal starts automatically once fee payment is verified.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="btn-cta-large"
                    onClick={sendStkPush}
                    disabled={stkLoading}
                    style={{ width: '100%', background: '#FF6600', boxShadow: '0 6px 20px rgba(255, 102, 0, 0.28)' }}
                  >
                    {stkLoading ? 'Triggering STK push...' : '💳 Send M-Pesa STK Push'}
                  </button>

                  {stkMessage && (
                    <p style={{ marginTop: '1rem', fontSize: '0.88rem', fontWeight: 700, color: '#047857', textAlign: 'center' }}>
                      {stkMessage}
                    </p>
                  )}
                  {stkError && (
                    <p style={{ marginTop: '1rem', fontSize: '0.88rem', fontWeight: 700, color: '#be123c', textAlign: 'center' }}>
                      {stkError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stage 3: Success */}
            {checkoutStage === 3 && (
              <div className="modal-stage active" style={{ textAlign: 'center' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '3rem 2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🎉</div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                    Application Submitted &amp; Verified Successfully!
                  </h2>
                  <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                    Your verification fee payment has been confirmed. Your loan application has moved to final review. Your allocated funds will be disbursed to your M-Pesa line <strong>{loanOffer.phoneNumber}</strong> shortly.
                  </p>
                  <button
                    className="btn-cta-large"
                    onClick={() => {
                      setCheckoutOpen(false);
                      onTabChange('home');
                      window.location.hash = '#customer';
                    }}
                    style={{ width: '100%', maxWidth: '280px', margin: '0 auto', background: '#FF6600', boxShadow: '0 6px 20px rgba(255,102,0,0.28)' }}
                  >
                    Go to Customer Portal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
