# Jijenge Loans - API Endpoints Specification

All API endpoints are prefixed with `/api`. Interactive OpenAPI Swagger documentation is available at `http://localhost:5000/api/docs`.

## Public & Loan Endpoints

- `POST /api/loans/apply`: Submit a new loan application. Returns transaction reference (`JJG-XXXXXX`).
- `GET /api/loans/track/:query`: Track application progress by transaction ref, phone, or ID.
- `GET /api/loans/eligibility`: Fetch active eligibility salary brackets.

## Payment & Webhook Endpoints

- `POST /api/payments/stkpush`: Initiate M-Pesa STK Push prompt for loan processing fee.
- `GET /api/payments/status/:txRef`: Poll fee payment status.
- `POST /api/webhooks/mpesa`: Callback endpoint handling PalPluss M-Pesa transaction results.

## Authentication Endpoints

- `POST /api/auth/customer/login`: Customer login via phone number & 4-digit PIN.
- `POST /api/auth/admin/login`: Super Admin & Staff login via email & password.
- `POST /api/auth/refresh`: Refresh expired access token using refresh token.

## Customer Portal Endpoints (JWT Protected)

- `GET /api/customer/dashboard`: Fetch borrower profile, active loan, and allocated balance.
- `POST /api/customer/withdraw`: Request M-Pesa withdrawal of allocated loan funds.

## Admin Management Endpoints (JWT Admin Protected)

- `GET /api/admin/analytics`: Aggregate KPI metrics (Total Applications, Paid Fees, Disbursed Funds).
- `GET /api/admin/applications`: Paginated application list with status filtering & multi-field search.
- `POST /api/admin/allocate-balance`: Allocate loan balance to customer account and approve loan.
- `POST /api/admin/update-status`: Update loan application workflow stage.

## Live Support Endpoints

- `POST /api/support/ticket`: Create support ticket inquiry.
- `GET /api/support/tickets`: List customer support tickets.
- `POST /api/support/tickets/:id/message`: Post message to support ticket.
