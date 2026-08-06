# Jijenge Loans - System Architecture Documentation

## Architectural Overview

Jijenge Loans follows a decoupled, monorepo architecture separating the user interface (`apps/frontend`) from the business logic and transaction processing engine (`apps/backend`), connected through strongly-typed shared packages (`packages/types`, `packages/shared`).

```
                              ┌────────────────────────┐
                              │  Vercel Frontend SPA   │
                              │  (React 19 + Vite + TS)│
                              └───────────┬────────────┘
                                          │ HTTPS REST API
                                          ▼
                              ┌────────────────────────┐
                              │   Render Backend API   │
                              │ (NestJS + TypeScript)  │
                              └─────┬──────────────┬───┘
                                    │              │
                    Prisma ORM      ▼              ▼    REST API
                ┌──────────────────────┐  ┌─────────────────────┐
                │ Supabase PostgreSQL  │  │ PalPluss & Capcom6  │
                │ Database (Normalized)│  │ Gateways (M-Pesa)   │
                └──────────────────────┘  └─────────────────────┘
```

## Security & Authentication Flow
- **Argon2 Hashing**: All customer 4-digit PINs and admin passwords are encrypted using Argon2 password hashing algorithm.
- **JWT Rotation**: Access tokens expire in 15m (Admin) / 1h (Customer). Refresh tokens expire in 7 days and are rotated on every use to prevent replay attacks.
- **Role-Based Access Control (RBAC)**: Guards enforce `SUPER_ADMIN`, `ADMIN`, `SUPPORT`, and `CUSTOMER` roles across all NestJS endpoints.
- **Rate Limiting & Helmet**: Prevents brute-force login attempts and hardens HTTP headers.
