import React, { useState, useEffect } from 'react';
import { calculateProcessingFee } from '../lib/shared';

interface ApplicationFormModalProps {
  onTabChange: (tabId: string) => void;
}

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Start 3-second loader sequence
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
        fullName,
        nationalId,
        age: parseInt(age, 10),
        gender,
        maritalStatus,
        phoneNumber,
        businessType,
        county,
        townArea,
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
        clearInterval(stepInterval);
        clearInterval(progressInterval);
        return;
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Connection error. Failed to submit application.');
      setShowAssessmentLoader(false);
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      return;
    }

    // Complete assessment loader after 3 seconds
    setTimeout(() => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setShowAssessmentLoader(false);
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
        <p className="section-subheading">Complete your details below to receive instant collateral-free funding directly to your M-Pesa line.</p>
      </div>

      <div className="application-form-wrapper">
        <form onSubmit={handleFormSubmit}>
          {/* Section 1: Personal Details */}
          <div className="form-section">
            <h3 className="form-section-title">
              <span className="section-icon-badge">👤</span>
              <span>1. Personal Information</span>
            </h3>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Full Name (As shown on ID) *</label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>National ID Number *</label>
                <input
                  type="text"
                  placeholder="Enter National ID"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Age (Years) *</label>
                <input
                  type="number"
                  placeholder="Age (18+)"
                  min="18"
                  max="90"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number (M-Pesa Line) *</label>
                <input
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Gender *</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Marital Status *</label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} required>
                  <option value="" disabled>Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Business Information */}
          <div className="form-section">
            <h3 className="form-section-title">
              <span className="section-icon-badge">🏬</span>
              <span>2. Business Information</span>
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Business Category *</label>
                <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} required>
                  <option value="" disabled>Select Category</option>
                  <option value="Retail & Small Shops">Retail & Small Shops</option>
                  <option value="Agriculture & Farming">Agriculture & Farming</option>
                  <option value="Transport Services">Transport Services</option>
                  <option value="Salon & Beauty Services">Salon & Beauty Services</option>
                  <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                  <option value="Food & Restaurant Vendors">Food & Restaurant Vendors</option>
                  <option value="Other Business">Other Services</option>
                </select>
              </div>
              <div className="form-group">
                <label>County *</label>
                <input
                  type="text"
                  placeholder="Enter County"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Town / Area *</label>
                <input
                  type="text"
                  placeholder="Enter Town or Area"
                  value={townArea}
                  onChange={(e) => setTownArea(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Monthly Income (KES) *</label>
                <select value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} required>
                  <option value="" disabled>Select Monthly Income</option>
                  <option value="15000:30000">Below Ksh 30,000</option>
                  <option value="30001:60000">Ksh 30,000 - Ksh 60,000</option>
                  <option value="60001:100000">Ksh 60,000 - Ksh 100,000</option>
                  <option value="100001:1000000">Above Ksh 100,000</option>
                </select>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="form-bottom-actions">
            <p className="form-disclaimer">
              By continuing, you agree to our Terms & Conditions and Privacy Policy. All credit profiles are verified under Central Bank regulations.
            </p>

            <button type="submit" className="btn-cta-large btn-form-submit">
              <span>Submit Application for Assessment</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* 5-Second Professional Loan Assessment Loader Modal */}
      {showAssessmentLoader && (
        <div className="modal-backdrop" id="fetching-loader-modal" style={{ display: 'flex', zIndex: 9999 }}>
          <div className="modal-dialog" style={{ maxWidth: '480px', textAlign: 'center', padding: '2.25rem 1.75rem', background: '#ffffff', borderRadius: '16px' }}>
            <div className="processing-box">
              <div className="spinner-ring" style={{ width: '58px', height: '58px', borderWidth: '5px', borderTopColor: '#0284c7', margin: '0 auto 1.25rem auto' }}></div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Assessing Application...</h3>
              <p className="processing-sub" style={{ fontSize: '0.875rem', color: '#0284c7', fontWeight: 700, margin: '0 0 1.25rem 0' }}>
                Verifying your information...
              </p>
              <div className="progress-bar-wrap" style={{ height: '10px', borderRadius: '5px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div className="progress-bar-fill" style={{ width: `${progressFill}%`, background: '#0284c7', height: '100%', transition: 'width 0.8s ease' }}></div>
              </div>
              <ul className="verification-steps" style={{ marginTop: '1.25rem', fontSize: '0.85rem', textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', listStyle: 'none' }}>
                <li style={{ marginBottom: '0.4rem', color: assessmentStep >= 1 ? '#047857' : '#64748b' }}>{assessmentStep >= 1 ? '✓' : '⏳'} Verifying ID and Identity Records...</li>
                <li style={{ marginBottom: '0.4rem', color: assessmentStep >= 2 ? '#047857' : '#64748b' }}>{assessmentStep >= 2 ? '✓' : '⏳'} Fetching applicant financial details...</li>
                <li style={{ marginBottom: '0.4rem', color: assessmentStep >= 3 ? '#047857' : '#64748b' }}>{assessmentStep >= 3 ? '✓' : '⏳'} Assessing credit bureau history...</li>
                <li style={{ marginBottom: '0.4rem', color: assessmentStep >= 4 ? '#047857' : '#64748b' }}>{assessmentStep >= 4 ? '✓' : '⏳'} Calculating maximum loan limit...</li>
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
          <header style={{ background: '#0f172a', padding: '1rem 1.75rem', color: '#ffffff', display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#0284c7', color: '#ffffff', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>BL</div>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff', letterSpacing: '-0.3px' }}>Jijenge Loans</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(false)}
              style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </header>

          <div className="modal-dialog" style={{ flex: 1, padding: '2rem 1.5rem', width: '100%', maxWidth: '680px', margin: '0 auto' }}>
            {/* Stage 1: Matched Offer */}
            {checkoutStage === 1 && (
              <div className="modal-stage active">
                <div className="payment-setup-box" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem 1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <div style={{ background: '#e0f2fe', borderRadius: '14px', padding: '1.5rem 1.25rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid #bae6fd' }}>
                    <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.725rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '0.5rem' }}>Verified Credit Profile</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Your Loan Assessment Result</h2>
                    <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                      We have assessed your application using the information provided. Based on our credit scoring model, you have been matched with the following package.
                    </p>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%), #0f172a', color: '#ffffff', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>ELIGIBLE LOAN AMOUNT</span>
                    <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#38bdf8', margin: 0 }}>KES {loanOffer.amount.toLocaleString()}</h3>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'between' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Assigned Package:</span>
                        <strong style={{ display: 'block', fontSize: '1.1rem', color: '#ffffff' }}>{loanOffer.packageName}</strong>
                      </div>
                      <span style={{ background: 'rgba(2, 132, 199, 0.25)', border: '1px solid #0284c7', color: '#38bdf8', fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '20px', alignSelf: 'center' }}>✓ System Matched</span>
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
                        <strong style={{ color: '#0284c7', fontWeight: 800 }}>KES {loanOffer.processingFee.toLocaleString()}</strong>
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
                    style={{ width: '100%' }}
                  >
                    Confirm & Proceed to Payment &rarr;
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
                      A verification fee of <strong>KES {loanOffer.processingFee.toLocaleString()}</strong> is required to activate and disburse your matched offer of <strong>KES {loanOffer.amount.toLocaleString()}</strong>.
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
                    style={{ width: '100%', background: '#10b981', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
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
                    Verification Fee Received Successfully!
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
                    style={{ width: '100%', maxWidth: '280px', margin: '0 auto' }}
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
