import React, { useState, useEffect } from 'react';
import { calculateProcessingFee } from '../lib/shared';
import { apiFetch } from '../lib/api';

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
  // Step State
  const [currentStep, setCurrentStep] = useState(1);

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
  const [stkSent, setStkSent] = useState(false);
  const [stkMessage, setStkMessage] = useState('');
  const [stkError, setStkError] = useState('');

  // Unfinished Application Detection State
  const [unfinishedModalOpen, setUnfinishedModalOpen] = useState(false);
  const [unfinishedLoan, setUnfinishedLoan] = useState<any>(null);
  const [unfinishedLoading, setUnfinishedLoading] = useState(false);

  const checkUnfinishedLoan = async (phoneVal?: string, idVal?: string) => {
    const p = normalizeKenyanPhone(phoneVal || phoneNumber) || (phoneVal || phoneNumber).trim();
    const id = (idVal || nationalId).trim();
    if (!p && !id) return;
    try {
      const res = await apiFetch('/api/loans/check-unfinished', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: p, nationalId: id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.loan) {
          setUnfinishedLoan(data.loan);
          setUnfinishedModalOpen(true);
        }
      }
    } catch { /* ignored */ }
  };

  const handleResumeUnfinished = async () => {
    if (!unfinishedLoan) return;
    setUnfinishedLoading(true);
    try {
      const res = await apiFetch('/api/loans/resume-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: unfinishedLoan.id })
      });
      const d = await res.json();
      if (res.ok && d.loan) {
        setLoanOffer(d.loan);
        setUnfinishedModalOpen(false);
        setCheckoutOpen(true);
        setCheckoutStage(2);
        setStkSent(true);
        setStkMessage(`STK Push prompt sent to ${d.loan.phoneNumber} for KES ${(d.loan.amount || 25000).toLocaleString()}. Please enter your M-Pesa PIN.`);
      } else {
        alert(d.message || 'Failed to resume application');
      }
    } catch {
      alert('Network error while resuming loan');
    } finally {
      setUnfinishedLoading(false);
    }
  };

  const handleCancelAndRestartUnfinished = async () => {
    if (!unfinishedLoan) return;
    setUnfinishedLoading(true);
    try {
      const res = await apiFetch('/api/loans/cancel-and-restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: unfinishedLoan.id })
      });
      const d = await res.json();
      if (res.ok) {
        if (d.userProfile) {
          if (d.userProfile.fullName) setFullName(d.userProfile.fullName);
          if (d.userProfile.nationalId) setNationalId(d.userProfile.nationalId);
          if (d.userProfile.phoneNumber) setPhoneNumber(d.userProfile.phoneNumber);
          if (d.userProfile.county) setCounty(d.userProfile.county);
          if (d.userProfile.townArea) setTownArea(d.userProfile.townArea);
          if (d.userProfile.businessType) setBusinessType(d.userProfile.businessType);
        }
        setUnfinishedModalOpen(false);
        setCurrentStep(1);
      }
    } catch {
      alert('Network error while cancelling old application');
    } finally {
      setUnfinishedLoading(false);
    }
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutStage(1);
    setStkSent(false);
    try {
      const saved = localStorage.getItem('jijenge_apply_form_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.checkoutOpen;
        delete parsed.checkoutStage;
        localStorage.setItem('jijenge_apply_form_data', JSON.stringify(parsed));
      }
    } catch { /* ignored */ }
  };

  // ── Persist & Restore Application State Across Page Refresh ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jijenge_apply_form_data');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.currentStep && typeof p.currentStep === 'number') setCurrentStep(p.currentStep);
        if (p.fullName) setFullName(p.fullName);
        if (p.nationalId) setNationalId(p.nationalId);
        if (p.age) setAge(p.age);
        if (p.phoneNumber) setPhoneNumber(p.phoneNumber);
        if (p.gender) setGender(p.gender);
        if (p.maritalStatus) setMaritalStatus(p.maritalStatus);
        if (p.businessType) setBusinessType(p.businessType);
        if (p.county) setCounty(p.county);
        if (p.townArea) setTownArea(p.townArea);
        if (p.monthlyIncome) setMonthlyIncome(p.monthlyIncome);
        if (p.loanOffer) setLoanOffer(p.loanOffer);
      }
    } catch (e) {
      console.warn('Could not restore form data:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = {
        currentStep,
        fullName,
        nationalId,
        age,
        phoneNumber,
        gender,
        maritalStatus,
        businessType,
        county,
        townArea,
        monthlyIncome,
        loanOffer,
      };
      localStorage.setItem('jijenge_apply_form_data', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save form data:', e);
    }
  }, [
    currentStep,
    fullName,
    nationalId,
    age,
    phoneNumber,
    gender,
    maritalStatus,
    businessType,
    county,
    townArea,
    monthlyIncome,
    loanOffer,
    checkoutOpen,
    checkoutStage,
  ]);

  const clearPersistedState = () => {
    localStorage.removeItem('jijenge_apply_form_data');
  };

  // Fetch backend eligibility brackets
  const [brackets, setBrackets] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/loans/eligibility')
      .then(res => res.json())
      .then(d => {
        if (d.success && Array.isArray(d.brackets)) {
          setBrackets(d.brackets);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-calculated fields based on monthly income mapping from database eligibility brackets
  const getMappedPackageDetails = (incomeValue: string) => {
    let minSal = 0;
    let maxSal = 0;
    if (incomeValue && incomeValue.includes(':')) {
      const parts = incomeValue.split(':');
      minSal = parseFloat(parts[0]) || 0;
      maxSal = parseFloat(parts[1]) || 0;
    }

    if (brackets.length > 0 && (minSal > 0 || maxSal > 0)) {
      const matched = brackets.find((b: any) =>
        (b.minSalary === minSal && b.maxSalary === maxSal) ||
        (minSal >= b.minSalary && minSal <= b.maxSalary) ||
        (maxSal >= b.minSalary && maxSal <= b.maxSalary) ||
        (minSal <= b.minSalary && maxSal >= b.maxSalary)
      );
      if (matched) {
        const limit = matched.maxLimit || 15000;
        return {
          name: matched.assignedPackageName || matched.name,
          amount: limit,
          tenure: limit > 60000 ? 90 : limit > 35000 ? 60 : limit > 15000 ? 45 : 30,
          processingFee: matched.processingFee ?? 450,
          weeklyRepayment: matched.weeklyRepayment || Math.round(limit * 1.05),
          monthlyRepayment: matched.monthlyRepayment || Math.round(limit * 1.12),
        };
      }
    }

    switch (incomeValue) {
      case '15000:30000':
        return { name: 'Jijenge Micro Booster', amount: 15000, tenure: 30, processingFee: 250, weeklyRepayment: 15750, monthlyRepayment: 16800 };
      case '30001:60000':
        return { name: 'Jijenge Business Flex', amount: 35000, tenure: 45, processingFee: 450, weeklyRepayment: 36750, monthlyRepayment: 39200 };
      case '60001:100000':
        return { name: 'Jijenge Trade Prime', amount: 60000, tenure: 60, processingFee: 750, weeklyRepayment: 63000, monthlyRepayment: 67200 };
      case '100001:1000000':
        return { name: 'Jijenge Enterprise Express', amount: 120000, tenure: 90, processingFee: 1200, weeklyRepayment: 126000, monthlyRepayment: 134400 };
      default:
        return { name: 'Jijenge Micro Booster', amount: 15000, tenure: 30, processingFee: 250, weeklyRepayment: 15750, monthlyRepayment: 16800 };
    }
  };

  const selectedPkg = getMappedPackageDetails(monthlyIncome);
  const processingFee = selectedPkg.processingFee ?? calculateProcessingFee(selectedPkg.amount);

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
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
    } else if (step === 2) {
      if (!businessType) {
        errs.businessType = 'Please select a business category.';
      }
      if (!county.trim()) {
        errs.county = 'County is required.';
      }
      if (!townArea.trim()) {
        errs.townArea = 'Town or Area is required.';
      }
    } else if (step === 3) {
      if (!monthlyIncome) {
        errs.monthlyIncome = 'Please select your monthly income range.';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateForm = () => {
    const s1 = validateStep(1);
    const s2 = validateStep(2);
    const s3 = validateStep(3);
    return s1 && s2 && s3;
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
        processingFee: selectedPkg.processingFee,
      };

      const res = await apiFetch('/api/loans/apply', {
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
      const targetPhone = loanOffer.phoneNumber || phoneNumber;
      const res = await apiFetch('/api/payments/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef: loanOffer.transactionRef,
          phoneNumber: targetPhone,
          phone: targetPhone,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success !== false) {
        setStkSent(true);
        setStkMessage(data.message || `STK push prompt sent to ${targetPhone}. Please enter your M-Pesa secret PIN.`);
        startPollingForPayment();
      } else {
        setStkError(data.message || 'Failed to trigger M-Pesa STK Push. Please verify phone number and retry.');
        setStkSent(false);
      }
    } catch (err: any) {
      setStkError(err.message || 'Network connection error. Failed to send STK push prompt.');
      setStkSent(false);
    } finally {
      setStkLoading(false);
    }
  };

  // Poll for payment success
  const startPollingForPayment = () => {
    if (!loanOffer) return;
    const intervalId = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/loans/track/${loanOffer.transactionRef}`);
        const data = await res.json();
        if (data.success && data.loan) {
          if (data.loan.feeStatus === 'Paid') {
            clearInterval(intervalId);
            setCheckoutStage(3);
            setStkLoading(false);
          } else if (data.loan.feeStatus === 'Failed' || data.loan.status === 'Payment_Failed') {
            clearInterval(intervalId);
            setStkError(data.loan.feeResultDesc || data.loan.resultDesc || 'M-Pesa STK Push prompt was cancelled or failed on your phone. Please click below to retry.');
            setStkSent(false);
            setStkLoading(false);
          }
        }
      } catch (err) {
        console.error('Payment polling error:', err);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(intervalId);
      if (checkoutStage === 2 && !stkError) {
        setStkError('Payment confirmation timed out. If you entered your PIN, check status via Track Loan or click Retry below.');
        setStkSent(false);
        setStkLoading(false);
      }
    }, 90000);
  };

  return (
    <>
      <div className="apply-page-header">
        <span className="sub-tag">100% Digital Application</span>
        <h1 className="section-heading">Apply for a Business Loan</h1>
        <p className="section-subheading">
          Complete your details below to receive instant collateral-free funding directly to your M-Pesa line.
        </p>
      </div>

      {/* Multi-step Progress Bar */}
      <div className="apply-progress">
        <div className={`apply-step ${currentStep === 1 ? 'apply-step--active' : currentStep > 1 ? 'apply-step--done' : ''}`}>
          <div className="apply-step__num">{currentStep > 1 ? '✓' : '1'}</div>
          <span className="apply-step__label">Personal</span>
        </div>
        <div className={`apply-progress__line ${currentStep > 1 ? 'apply-progress__line--done' : ''}`} />
        <div className={`apply-step ${currentStep === 2 ? 'apply-step--active' : currentStep > 2 ? 'apply-step--done' : ''}`}>
          <div className="apply-step__num">{currentStep > 2 ? '✓' : '2'}</div>
          <span className="apply-step__label">Business</span>
        </div>
        <div className={`apply-progress__line ${currentStep > 2 ? 'apply-progress__line--done' : ''}`} />
        <div className={`apply-step ${currentStep === 3 ? 'apply-step--active' : ''}`}>
          <div className="apply-step__num">3</div>
          <span className="apply-step__label">Assessment</span>
        </div>
      </div>

      {submitErrorMessage && (
        <div className="jijenge-alert jijenge-alert-error" style={{ maxWidth: '860px', margin: '0 auto 1.5rem' }}>
          <span>⚠️</span>
          <span>{submitErrorMessage}</span>
        </div>
      )}

      {/* Step Container Card */}
      <div className="apply-step-card">
        <form onSubmit={handleFormSubmit} noValidate>
          {/* STEP 1: Personal Details */}
          {currentStep === 1 && (
            <div className="form-section">
              <h2 className="form-section-title">
                <span className="section-icon-badge">👤</span>
                <span>Personal Information</span>
              </h2>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="full-name" className="jijenge-label">
                    Full Name (As shown on ID) <span className="required-star">*</span>
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    placeholder="Enter Full Official Name"
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
                  <label htmlFor="national-id" className="jijenge-label">
                    National ID Number <span className="required-star">*</span>
                  </label>
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
                  <label htmlFor="applicant-age" className="jijenge-label">
                    Age (Years) <span className="required-star">*</span>
                  </label>
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
                  <label htmlFor="phone-number" className="jijenge-label">
                    Phone Number (M-Pesa Line) <span className="required-star">*</span>
                  </label>
                  <input
                    id="phone-number"
                    type="tel"
                    placeholder="e.g. 0712345678"
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
                  <label htmlFor="applicant-gender" className="jijenge-label">
                    Gender <span className="required-star">*</span>
                  </label>
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
                  <label htmlFor="marital-status" className="jijenge-label">
                    Marital Status <span className="required-star">*</span>
                  </label>
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

              <div className="form-bottom-actions">
                <div className="form-step-nav">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (validateStep(1)) {
                        setCurrentStep(2);
                        window.scrollTo({ top: 220, behavior: 'smooth' });
                      }
                    }}
                  >
                    <span>Continue to Business Details</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business Details */}
          {currentStep === 2 && (
            <div className="form-section">
              <h2 className="form-section-title">
                <span className="section-icon-badge">🏬</span>
                <span>Business / Income Information</span>
              </h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="business-type" className="jijenge-label">
                    Business Category <span className="required-star">*</span>
                  </label>
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
                    <option value="" disabled>Select Business Category</option>
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
                  <label htmlFor="county-location" className="jijenge-label">
                    County <span className="required-star">*</span>
                  </label>
                  <input
                    id="county-location"
                    type="text"
                    placeholder="e.g. Nairobi, Kiambu, Nakuru"
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
                  <label htmlFor="town-area" className="jijenge-label">
                    Town / Area <span className="required-star">*</span>
                  </label>
                  <input
                    id="town-area"
                    type="text"
                    placeholder="e.g. Westlands, Thika Town"
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
              </div>

              <div className="form-bottom-actions">
                <div className="form-step-nav">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setCurrentStep(1);
                      window.scrollTo({ top: 220, behavior: 'smooth' });
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (validateStep(2)) {
                        setCurrentStep(3);
                        window.scrollTo({ top: 220, behavior: 'smooth' });
                      }
                    }}
                  >
                    <span>Continue to Assessment</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Assessment & Package Selection */}
          {currentStep === 3 && (
            <div className="form-section">
              <h2 className="form-section-title">
                <span className="section-icon-badge">📊</span>
                <span>Loan Assessment &amp; Package</span>
              </h2>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="monthly-income" className="jijenge-label">
                    Monthly Business Income (KES) <span className="required-star">*</span>
                  </label>
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
                    <option value="" disabled>Select Monthly Income Range</option>
                    {brackets.length > 0 ? (
                      brackets.map((b: any, idx: number) => {
                        let label = `Ksh ${b.minSalary.toLocaleString()} – Ksh ${b.maxSalary.toLocaleString()}`;
                        if (idx === 0) {
                          label = `Below Ksh ${b.maxSalary.toLocaleString()}`;
                        } else if (idx === brackets.length - 1) {
                          label = `Above Ksh ${b.minSalary.toLocaleString()}`;
                        }
                        return (
                          <option key={b.id || `${b.minSalary}-${b.maxSalary}`} value={`${b.minSalary}:${b.maxSalary}`}>
                            {label}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="15000:30000">Below Ksh 30,000</option>
                        <option value="30001:60000">Ksh 30,001 – Ksh 60,000</option>
                        <option value="60001:100000">Ksh 60,001 – Ksh 100,000</option>
                        <option value="100001:1000000">Above Ksh 100,000</option>
                      </>
                    )}
                  </select>
                  {formErrors.monthlyIncome && <span className="form-field-error">{formErrors.monthlyIncome}</span>}
                </div>
              </div>

              {monthlyIncome && (
                <div className="loan-preview-card">
                  <div className="loan-preview-label">Matched Package Preview</div>
                  <div className="loan-preview-amount">KES {selectedPkg.amount.toLocaleString()}</div>
                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.75rem' }}>
                    {selectedPkg.name}
                  </div>
                  <div className="loan-preview-details">
                    <div>
                      <span className="loan-preview-detail-label">Est. Verification Fee</span>
                      <span className="loan-preview-detail-value">KES {processingFee.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="loan-preview-detail-label">Repayment Period</span>
                      <span className="loan-preview-detail-value">{selectedPkg.tenure} Days</span>
                    </div>
                    <div>
                      <span className="loan-preview-detail-label">7-Day Repayment (@ 5%)</span>
                      <span className="loan-preview-detail-value" style={{ color: '#10b981', fontWeight: 700 }}>
                        KES {selectedPkg.weeklyRepayment?.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="loan-preview-detail-label">30-Day Repayment (@ 12%)</span>
                      <span className="loan-preview-detail-value" style={{ color: '#3b82f6', fontWeight: 700 }}>
                        KES {selectedPkg.monthlyRepayment?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-bottom-actions">
                <p className="form-disclaimer">
                  By continuing, you agree to our Terms &amp; Conditions and Privacy Policy. All credit profiles are verified under Central Bank regulations.
                </p>

                <div className="form-step-nav">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setCurrentStep(2);
                      window.scrollTo({ top: 220, behavior: 'smooth' });
                    }}
                    disabled={submitting}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    <span>Back</span>
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    <span>{submitting ? 'Submitting Application...' : 'Submit Application for Assessment'}</span>
                    {!submitting && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Security Reassurance Strip */}
      <div className="apply-trust-strip">
        <div className="apply-trust-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>256-bit SSL Encrypted</span>
        </div>
        <div className="apply-trust-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Under 15 Min Disbursal</span>
        </div>
        <div className="apply-trust-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>ODPC Data Protected</span>
        </div>
      </div>

      {/* 5-Second Professional Loan Assessment Loader Modal */}
      {showAssessmentLoader && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div className="processing-box">
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#FF6600', animation: 'spin 1s linear infinite', margin: '0 auto 1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-navy)', marginBottom: '0.25rem' }}>Assessing Application...</h3>
              <p style={{ fontSize: '0.875rem', color: '#FF6600', fontWeight: 700, marginBottom: '1.25rem' }}>
                Verifying your information...
              </p>
              <div style={{ height: '8px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ background: '#FF6600', height: '100%', width: `${progressFill}%`, transition: 'width 300ms ease' }} />
              </div>
              <ul style={{ marginTop: '1.25rem', fontSize: '0.75rem', textAlign: 'left', background: '#f8fafc', border: '1px solid #f1f5f9', padding: '1rem', borderRadius: '12px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: assessmentStep >= 1 ? '#059669' : '#94a3b8', fontWeight: assessmentStep >= 1 ? 700 : 400 }}>{assessmentStep >= 1 ? '✓' : '⏳'} Verifying ID and Identity Records...</li>
                <li style={{ color: assessmentStep >= 2 ? '#059669' : '#94a3b8', fontWeight: assessmentStep >= 2 ? 700 : 400 }}>{assessmentStep >= 2 ? '✓' : '⏳'} Fetching applicant financial details...</li>
                <li style={{ color: assessmentStep >= 3 ? '#059669' : '#94a3b8', fontWeight: assessmentStep >= 3 ? 700 : 400 }}>{assessmentStep >= 3 ? '✓' : '⏳'} Assessing credit bureau history...</li>
                <li style={{ color: assessmentStep >= 4 ? '#059669' : '#94a3b8', fontWeight: assessmentStep >= 4 ? 700 : 400 }}>{assessmentStep >= 4 ? '✓' : '⏳'} Calculating maximum loan limit...</li>
                <li style={{ color: assessmentStep >= 5 ? '#059669' : '#94a3b8', fontWeight: assessmentStep >= 5 ? 700 : 400 }}>{assessmentStep >= 5 ? '✓' : '⏳'} Preparing customized loan package offer...</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Checkout & Verification View Modal */}
      {checkoutOpen && loanOffer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', zIndex: 9999, overflowY: 'auto' }}>
          {/* Checkout Header */}
          <header style={{ background: 'var(--brand-navy)', padding: '1rem 1.5rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.png" alt="Jijenge Loans" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#ffffff', letterSpacing: '-0.02em' }}>Jijenge Loans</span>
              <button
                type="button"
                onClick={handleCloseCheckout}
                style={{ marginLeft: '1rem', background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ← Back to Home
              </button>
            </div>
            <button
              onClick={handleCloseCheckout}
              style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 800, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label="Close offer view"
            >
              ✕
            </button>
          </header>

          <div style={{ flex: 1, padding: '1.5rem 1rem', width: '100%', maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Stage 1: Matched Offer */}
            {checkoutStage === 1 && (
              <div style={{ width: '100%' }}>
                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%' }}>
                  <div style={{ background: '#FFF5ED', border: '1px solid #FFD6B3', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                    <span className="jijenge-badge jijenge-badge-success" style={{ marginBottom: '0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application Submitted Successfully</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-navy)', margin: '0.25rem 0 0.5rem', letterSpacing: '-0.02em' }}>Your Loan Application Assessment Result</h2>
                    <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                      Your application has been received and verified against Central Bank credit scoring models. You are matched with the offer below.
                    </p>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#ffffff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>MATCHED LOAN OFFER</span>
                    <h3 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#FF6600', margin: 0 }}>KES {(loanOffer.amount || 0).toLocaleString()}</h3>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Assigned Package:</span>
                        <strong style={{ display: 'block', fontSize: '1rem', color: '#ffffff', marginTop: '0.1rem' }}>{loanOffer.packageName}</strong>
                      </div>
                      <span className="jijenge-badge jijenge-badge-warning" style={{ padding: '0.25rem 0.75rem' }}>✓ Verified</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.1rem' }}>Loan Package</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{loanOffer.packageName}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.1rem' }}>Processing Fee</span>
                        <strong style={{ color: '#FF6600', fontWeight: 800 }}>KES {(loanOffer.processingFee || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.1rem' }}>Repayment Period</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{loanOffer.tenureDays} Days</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.1rem' }}>Repayment Cycle</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>Weekly</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => setCheckoutStage(2)}
                  >
                    Confirm &amp; Proceed to Payment &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Stage 2: Payment */}
            {checkoutStage === 2 && (
              <div style={{ width: '100%' }}>
                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <span className="jijenge-badge jijenge-badge-success" style={{ marginBottom: '0.4rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>M-Pesa Verification Payment</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-navy)', margin: 0 }}>M-Pesa Verification Payment</h2>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.4rem', marginBottom: 0, lineHeight: 1.5 }}>
                      Verification fee of <strong>KES {(loanOffer.processingFee || 450).toLocaleString()}</strong> is required to activate and disburse your offer of <strong>KES {(loanOffer.amount || 0).toLocaleString()}</strong>.
                    </p>
                  </div>

                  {stkSent ? (
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '20px', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '0.45rem 0.9rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800, color: '#166534', marginBottom: '0.85rem' }}>
                        <span>📲 Prompt Sent to:</span>
                        <span>{loanOffer.phoneNumber || phoneNumber}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#15803D', fontWeight: 800, fontSize: '0.9rem' }}>
                        <span className="trust-pulse" style={{ background: '#22C55E' }} />
                        <span>Waiting for M-Pesa PIN entry...</span>
                      </div>

                      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #BBF7D0', padding: '1rem', textAlign: 'left', fontSize: '0.825rem', color: '#166534', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: '#DCFCE7', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: '#15803D' }}>1</span>
                          <span>Check your mobile screen for the M-Pesa pop-up.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: '#DCFCE7', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: '#15803D' }}>2</span>
                          <span>Enter your secret <strong>M-Pesa PIN</strong> for KES {(loanOffer.processingFee || 450).toLocaleString()}.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: '#DCFCE7', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: '#15803D' }}>3</span>
                          <span>Disbursal starts automatically upon PIN confirmation.</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>M-Pesa Phone Number:</span>
                        <span style={{ color: '#FF6600', fontWeight: 900 }}>{loanOffer.phoneNumber || phoneNumber}</span>
                      </div>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#475569', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <li>Ensure your phone is unlocked and active.</li>
                        <li>Click the button below to receive an M-Pesa STK push prompt.</li>
                        <li>Enter your M-Pesa secret PIN to confirm payment.</li>
                      </ul>
                    </div>
                  )}

                  {stkError && (
                    <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                        <span>⚠️</span>
                        <span>M-Pesa Prompt Notice</span>
                      </div>
                      <p style={{ margin: 0 }}>{stkError}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%' }}
                    onClick={sendStkPush}
                    disabled={stkLoading}
                  >
                    {stkLoading
                      ? '📱 Sending STK Push Prompt...'
                      : stkSent
                      ? '🔄 Resend M-Pesa STK Push'
                      : '💳 Send M-Pesa STK Push'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem' }}>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '0.65rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={handleCloseCheckout}
                    >
                      ✕ Close &amp; Return Home
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, padding: '0.65rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => {
                        clearPersistedState();
                        handleCloseCheckout();
                        setCurrentStep(1);
                      }}
                    >
                      🔄 Start Fresh Form
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 3: Success */}
            {checkoutStage === 3 && (
              <div style={{ width: '100%' }}>
                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-navy)', marginBottom: '0.75rem' }}>
                    Application Submitted &amp; Verified!
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Your verification fee payment has been confirmed. Your loan application has moved to final review. Your allocated funds will be disbursed to your M-Pesa line <strong>{loanOffer.phoneNumber}</strong> shortly.
                  </p>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', maxWidth: '280px', margin: '0 auto', display: 'block' }}
                    onClick={() => {
                      clearPersistedState();
                      setCheckoutOpen(false);
                      if (onTabChange) onTabChange('customer');
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
      {/* ══ MODAL: UNFINISHED APPLICATION DETECTED ══ */}
      {unfinishedModalOpen && unfinishedLoan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '460px', width: '100%', padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#FF6600', fontSize: '1.5rem', fontWeight: 800 }}>
              ⚡
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
              Unfinished Application Found
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
              Hi <strong>{unfinishedLoan.fullName}</strong>, you have an incomplete loan application for <strong>{unfinishedLoan.packageName}</strong> (Ref: <code style={{ color: '#FF6600', fontWeight: 700 }}>{unfinishedLoan.transactionRef}</code>).
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>Requested Loan Amount:</span>
                <strong style={{ color: '#0f172a' }}>KES {(unfinishedLoan.amount || 25000).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>Processing Fee:</span>
                <strong style={{ color: '#1e40af' }}>KES {(unfinishedLoan.processingFee || 450).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Current Status:</span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {(unfinishedLoan.status || '').replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={unfinishedLoading}
                onClick={handleResumeUnfinished}
                style={{ width: '100%', padding: '0.85rem', background: '#FF6600', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}
              >
                {unfinishedLoading ? 'Resuming Application...' : '⚡ Resume & Trigger STK Push Prompt'}
              </button>

              <button
                type="button"
                disabled={unfinishedLoading}
                onClick={handleCancelAndRestartUnfinished}
                style={{ width: '100%', padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                🔄 Cancel &amp; Start Fresh Application
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApplicationFormModal;
