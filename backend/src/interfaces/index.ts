/* ==========================================================================
   Jijenge Loans - Backend TypeScript Interfaces & DTOs
   ========================================================================== */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  CUSTOMER = 'CUSTOMER'
}

export enum LoanStatus {
  PENDING = 'Pending',
  PENDING_STK_FEE_PAYMENT = 'Pending STK Fee Payment',
  APPLICATION_RECEIVED = 'Application Received',
  INITIAL_VERIFICATION = 'Initial Verification',
  DOCUMENT_VERIFICATION = 'Document Verification',
  CREDIT_ASSESSMENT = 'Credit Assessment',
  RISK_ASSESSMENT = 'Risk Assessment',
  LOAN_REVIEW = 'Loan Review',
  UNDER_REVIEW = 'Under Review',
  PROCESSING = 'Processing',
  APPROVED = 'Approved',
  AWAITING_DISBURSEMENT = 'Awaiting Disbursement',
  DISBURSEMENT_IN_PROGRESS = 'Disbursement In Progress',
  DISBURSED = 'Disbursed',
  LOAN_COMPLETED = 'Loan Completed',
  REJECTED = 'Rejected',
  PAYMENT_FAILED = 'Payment Failed',
  PAYMENT_TIMED_OUT = 'Payment Timed Out'
}

export enum FeeStatus {
  PENDING_STK_PUSH = 'Pending STK Push',
  PAID = 'Paid',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
  EXPIRED = 'Expired'
}

export enum WithdrawalStatus {
  UNPAID = 'Unpaid',
  PENDING = 'Pending',
  PAID = 'Paid',
  FAILED = 'Failed'
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
