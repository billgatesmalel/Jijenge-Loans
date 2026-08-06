# Jijenge Loans - Database Schema & Neon PostgreSQL Guide

The database is built on **Neon Serverless PostgreSQL** and managed exclusively via **Prisma ORM**.

## Neon PostgreSQL Connection Setup
Neon provides two connection strings:
1. `DATABASE_URL`: Pooled connection string (`sslmode=require` with `-pooler` endpoint) for application queries & serverless runtime.
2. `DIRECT_URL`: Direct unpooled connection string for Prisma schema migrations (`npx prisma migrate dev`).

## Core Relational Tables

1. **`User`**: Borrower account profiles, national ID, phone number, pin hash, and lockout state.
2. **`Admin`**: Administrative user credentials, RBAC role, and active status.
3. **`RefreshToken`**: Session tracking tokens with revocation flags.
4. **`LoanApplication`**: Transaction reference (`JJG-XXXXXX`), loan package details, processing fee status, M-Pesa receipt, and allocated balance.
5. **`Withdrawal`**: Customer balance withdrawal records and disbursement tracking.
6. **`EligibilityBracket`**: Configurable salary brackets for loan package matching.
7. **`WorkflowStage`**: Application review workflow stages.
8. **`SmsTemplate` & `SmsLog`**: SMS message body templates & Capcom6 gateway dispatch logs.
9. **`SupportTicket` & `SupportMessage`**: Live customer support ticket conversations.
10. **`AuditLog`**: System audit trail logging all sensitive admin allocations and updates.
