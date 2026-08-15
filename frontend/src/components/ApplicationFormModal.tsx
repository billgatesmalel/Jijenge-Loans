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

  // Inline Validation & Error States
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');

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

    if (submitting) return; // Prevent duplicate clicks

    setSubmitErrorMessage('');

    if (!validateForm()) {
      window.scrollTo({ top: 220, behavior: 'smooth' });
      return;
    }

    const normPhone = normalizeKenyanPhone(phoneNumber) || phoneNumber.trim();

    setSubmitting(true);
    setShowAssessmentLoader(true);
    setProgressFill(0);
    setAssessmentStep(1);

    let stepInterval: any = null;
    let progressInterval: any = null;

    stepInterval = setInterval(() => {
      setAssessmentStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 600);

    progressInterval = setInterval(() => {
      setProgressFill((prev) => (prev < 100 ? prev + 10 : 100));
    }, 300);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second safety timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const errText = await res.text();
        console.error('Non-JSON response from backend:', res.status, errText);
        throw new Error('Backend returned an invalid format. Please try again.');
      }

      if (res.ok && data?.success && data?.loan) {
        setLoanOffer(data.loan);

        // Keep assessment animation running smoothly for 2.5 seconds total
        await new Promise((resolve) => setTimeout(resolve, 2500));

        if (stepInterval) clearInterval(stepInterval);
        if (progressInterval) clearInterval(progressInterval);
        setShowAssessmentLoader(false);
        setSubmitting(false);
        setCheckoutOpen(true);
        setCheckoutStage(1);
      } else {
        const msg = data?.message || 'Application verification failed. Please check your details and try again.';
        setSubmitErrorMessage(msg);
      }
    } catch (err: any) {
      console.error('Loan submission exception:', err);
      if (err.name === 'AbortError') {
        setSubmitErrorMessage('Request timed out. Please check your internet connection and try again.');
      } else {
        setSubmitErrorMessage(err.message || 'We encountered a connection problem. Please try submitting again.');
      }
    } finally {
      clearTimeout(timeoutId);
      if (stepInterval) clearInterval(stepInterval);
      if (progressInterval) clearInterval(progressInterval);
      // Guarantee loading state cleanup under all circumstances
      setShowAssessmentLoader(false);
      setSubmitting(false);
    }
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
        <div className="flex items-center justify-between mb-8 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#FF6600]">
            <span className="w-6 h-6 rounded-full bg-[#FF6600] text-white flex items-center justify-center text-xs">1</span>
            <span>Personal</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-300 mx-3" />
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs">2</span>
            <span>Business</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-300 mx-3" />
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs">3</span>
            <span>Assessment</span>
          </div>
        </div>

        {submitErrorMessage && (
          <div className="jijenge-alert jijenge-alert-error mb-6">
            <span className="text-lg">⚠️</span>
            <span>{submitErrorMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} noValidate>
          {/* Section 1: Personal Details */}
          <div className="form-section">
            <h3 className="form-section-title">
              <span className="section-icon-badge">👤</span>
              <span>1. Personal Information</span>
            </h3>
            <div className="form-grid">
              <div className="form-group sm:col-span-2">
                <label htmlFor="full-name" className="jijenge-label">Full Name (As shown on ID) *</label>
                <input
                  id="full-name"
                  type="text"
                  placeholder="Enter Full Name"
                  value={fullName}
                  className={`jijenge-input ${formErrors.fullName ? 'jijenge-input-error' : ''}`}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (formErrors.fullName) setFormErrors((p) => ({ ...p, fullName: '' }));
                  }}
                  required
                />
                {formErrors.fullName && <span className="form-field-error">{formErrors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="national-id" className="jijenge-label">National ID Number *</label>
                <input
                  id="national-id"
                  type="text"
                  placeholder="Enter National ID"
                  value={nationalId}
                  className={`jijenge-input ${formErrors.nationalId ? 'jijenge-input-error' : ''}`}
                  onChange={(e) => {
                    setNationalId(e.target.value);
                    if (formErrors.nationalId) setFormErrors((p) => ({ ...p, nationalId: '' }));
                  }}
                  required
                />
                {formErrors.nationalId && <span className="form-field-error">{formErrors.nationalId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="applicant-age" className="jijenge-label">Age (Years) *</label>
                <input
                  id="applicant-age"
                  type="number"
                  placeholder="Age (18+)"
                  min="18"
                  max="90"
                  value={age}
                  className={`jijenge-input ${formErrors.age ? 'jijenge-input-error' : ''}`}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (formErrors.age) setFormErrors((p) => ({ ...p, age: '' }));
                  }}
                  required
                />
                {formErrors.age && <span className="form-field-error">{formErrors.age}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone-number" className="jijenge-label">Phone Number (M-Pesa Line) *</label>
                <input
                  id="phone-number"
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  value={phoneNumber}
                  className={`jijenge-input ${formErrors.phoneNumber ? 'jijenge-input-error' : ''}`}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (formErrors.phoneNumber) setFormErrors((p) => ({ ...p, phoneNumber: '' }));
                  }}
                  required
                />
                {formErrors.phoneNumber && <span className="form-field-error">{formErrors.phoneNumber}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="applicant-gender" className="jijenge-label">Gender *</label>
                <select
                  id="applicant-gender"
                  value={gender}
                  className={`jijenge-select ${formErrors.gender ? 'jijenge-input-error' : ''}`}
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
                <label htmlFor="marital-status" className="jijenge-label">Marital Status *</label>
                <select
                  id="marital-status"
                  value={maritalStatus}
                  className={`jijenge-select ${formErrors.maritalStatus ? 'jijenge-input-error' : ''}`}
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
                <label htmlFor="business-type" className="jijenge-label">Business Category *</label>
                <select
                  id="business-type"
                  value={businessType}
                  className={`jijenge-select ${formErrors.businessType ? 'jijenge-input-error' : ''}`}
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
                <label htmlFor="county-location" className="jijenge-label">County *</label>
                <input
                  id="county-location"
                  type="text"
                  placeholder="Enter County"
                  value={county}
                  className={`jijenge-input ${formErrors.county ? 'jijenge-input-error' : ''}`}
                  onChange={(e) => {
                    setCounty(e.target.value);
                    if (formErrors.county) setFormErrors((p) => ({ ...p, county: '' }));
                  }}
                  required
                />
                {formErrors.county && <span className="form-field-error">{formErrors.county}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="town-area" className="jijenge-label">Town / Area *</label>
                <input
                  id="town-area"
                  type="text"
                  placeholder="Enter Town or Area"
                  value={townArea}
                  className={`jijenge-input ${formErrors.townArea ? 'jijenge-input-error' : ''}`}
                  onChange={(e) => {
                    setTownArea(e.target.value);
                    if (formErrors.townArea) setFormErrors((p) => ({ ...p, townArea: '' }));
                  }}
                  required
                />
                {formErrors.townArea && <span className="form-field-error">{formErrors.townArea}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="monthly-income" className="jijenge-label">Monthly Income (KES) *</label>
                <select
                  id="monthly-income"
                  value={monthlyIncome}
                  className={`jijenge-select ${formErrors.monthlyIncome ? 'jijenge-input-error' : ''}`}
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

            <button type="submit" disabled={submitting} className="btn-primary w-full">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-2xl max-w-[480px] w-full text-center">
            <div className="processing-box">
              <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-[#FF6600] animate-spin mx-auto mb-5" />
              <h3 className="text-xl font-extrabold text-brand-navy mb-1">Assessing Application...</h3>
              <p className="text-sm text-[#FF6600] font-bold mb-5">
                Verifying your information...
              </p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="bg-[#FF6600] h-full transition-all duration-300" style={{ width: `${progressFill}%` }} />
              </div>
              <ul className="mt-5 text-xs text-left bg-slate-50 border border-slate-100 p-4 rounded-xl list-none space-y-2">
                <li className={assessmentStep >= 1 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{assessmentStep >= 1 ? '✓' : '⏳'} Verifying ID and Identity Records...</li>
                <li className={assessmentStep >= 2 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{assessmentStep >= 2 ? '✓' : '⏳'} Fetching applicant financial details...</li>
                <li className={assessmentStep >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{assessmentStep >= 3 ? '✓' : '⏳'} Assessing credit bureau history...</li>
                <li className={assessmentStep >= 4 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{assessmentStep >= 4 ? '✓' : '⏳'} Calculating maximum loan limit...</li>
                <li className={assessmentStep >= 5 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{assessmentStep >= 5 ? '✓' : '⏳'} Preparing customized loan package offer...</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Checkout & Verification View Modal */}
      {checkoutOpen && loanOffer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col z-[999] overflow-y-auto">
          {/* Checkout Header */}
          <header className="bg-brand-navy px-6 py-4 text-white flex justify-between items-center w-full sticky top-0 z-10 shadow-md">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Jijenge Loans" className="w-9 h-9 object-contain" />
              <span className="font-extrabold text-lg text-white tracking-tight">Jijenge Loans</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(false)}
              className="text-white hover:text-slate-300 text-xl font-bold bg-none border-none cursor-pointer"
              aria-label="Close offer view"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 p-6 sm:p-8 w-full max-w-[680px] mx-auto flex items-center justify-center">
            {/* Stage 1: Matched Offer */}
            {checkoutStage === 1 && (
              <div className="modal-stage active w-full">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl w-full">
                  <div className="bg-[#FFF5ED] border border-[#FFD6B3] rounded-2xl p-6 text-center mb-6">
                    <span className="jijenge-badge jijenge-badge-success mb-2 text-xs uppercase tracking-wider">Application Submitted Successfully</span>
                    <h2 className="text-xl sm:text-2xl font-black text-brand-navy mt-1 mb-2 tracking-tight">Your Loan Application Assessment Result</h2>
                    <p className="text-xs sm:text-sm text-slate-600 m-0 leading-relaxed">
                      Your application has been received and verified against Central Bank credit scoring models. You are matched with the offer below.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
                    <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase block mb-1">MATCHED LOAN OFFER</span>
                    <h3 className="text-3xl sm:text-4xl font-black text-[#FF6600] m-0">KES {(loanOffer.amount || 0).toLocaleString()}</h3>
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-slate-300">Assigned Package:</span>
                        <strong className="block text-base text-white mt-0.5">{loanOffer.packageName}</strong>
                      </div>
                      <span className="jijenge-badge jijenge-badge-warning px-3 py-1">✓ Verified</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Loan Package</span>
                        <strong className="text-slate-900 font-extrabold">{loanOffer.packageName}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Processing Fee</span>
                        <strong className="text-[#FF6600] font-extrabold">KES {(loanOffer.processingFee || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Repayment Period</span>
                        <strong className="text-slate-900 font-extrabold">{loanOffer.tenureDays} Days</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Repayment Cycle</span>
                        <strong className="text-slate-900 font-extrabold">Weekly</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => setCheckoutStage(2)}
                  >
                    Confirm &amp; Proceed to Payment &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Stage 2: Payment */}
            {checkoutStage === 2 && (
              <div className="modal-stage active w-full">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl w-full">
                  <div className="text-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-navy m-0">M-Pesa Verification Payment</h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 mb-0 leading-relaxed">
                      A verification fee of <strong>KES {(loanOffer.processingFee || 0).toLocaleString()}</strong> is required to activate and disburse your matched offer of <strong>KES {(loanOffer.amount || 0).toLocaleString()}</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                    <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 space-y-2 m-0">
                      <li>Ensure your phone is unlocked and active.</li>
                      <li>Click the button below to receive an M-Pesa STK push prompt.</li>
                      <li>Enter your M-Pesa secret PIN to confirm payment.</li>
                      <li>Disbursal starts automatically once fee payment is verified.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={sendStkPush}
                    disabled={stkLoading}
                  >
                    {stkLoading ? 'Triggering STK push...' : '💳 Send M-Pesa STK Push'}
                  </button>

                  {stkMessage && (
                    <p className="mt-4 text-sm font-bold text-emerald-600 text-center">
                      {stkMessage}
                    </p>
                  )}
                  {stkError && (
                    <p className="mt-4 text-sm font-bold text-red-600 text-center">
                      {stkError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stage 3: Success */}
            {checkoutStage === 3 && (
              <div className="modal-stage active w-full">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl w-full text-center">
                  <div className="text-5xl mb-5">🎉</div>
                  <h2 className="text-xl sm:text-2xl font-black text-brand-navy mb-3">
                    Application Submitted &amp; Verified!
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Your verification fee payment has been confirmed. Your loan application has moved to final review. Your allocated funds will be disbursed to your M-Pesa line <strong>{loanOffer.phoneNumber}</strong> shortly.
                  </p>
                  <button
                    className="btn-primary w-full max-w-[280px] mx-auto block"
                    onClick={() => {
                      setCheckoutOpen(false);
                      onTabChange('home');
                      window.location.hash = '#customer';
                    }}
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

