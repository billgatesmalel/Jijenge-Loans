# Jijenge Loans - Database Schema & Supabase PostgreSQL Guide

The database is built on **Supabase PostgreSQL** and managed exclusively via **Prisma ORM**.

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

## Indexing & Performance Optimization
- `User(phoneNumber)`, `User(nationalId)` indexed for instant login lookups.
- `LoanApplication(phoneNumber, createdAt DESC)` indexed for customer dashboard queries.
- `LoanApplication(transactionRef)` indexed for instant M-Pesa webhook callback resolution.
