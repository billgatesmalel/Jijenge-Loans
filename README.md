# Jijenge Loans - Enterprise Fintech Loan Platform (Monorepo)

**Jijenge Loans (Licensed by CBK)** is a modern commercial fintech web application for business growth loans in Kenya. Rebuilt and modernized from the Booster Loans repository into a high-performance monorepo using **React 19**, **NestJS**, **TypeScript**, **Prisma ORM**, and **Supabase PostgreSQL**.

---

## 🚀 Key Features

* **Instant STK Fee Payment**: Automated PalPluss M-Pesa STK Push fee collection with instant webhook verification (`/api/webhooks/mpesa`).
* **SMS Gateway Integration**: Capcom6 Android SMS Gateway (`api.sms-gate.app`) integration formatting phone numbers automatically to `+254` international format.
* **Customer Portal**: Phone + 4-Digit PIN authentication with Argon2 hashing, real-time allocated loan balance view, and instant M-Pesa withdrawal requests.
* **Super Admin Dashboard**: Full analytics KPIs (Total Revenue, Conversion Rate, Disbursed Loans), search & filter applications table, loan balance allocator, and system settings.
* **CBK Compliance & ODPC Data Protection**: Regulatory legal disclosures, data privacy controls, and 256-bit encrypted API communication.

---

## 📁 Monorepo Layout

```
Jijenge-Loans/
├── apps/
│   ├── frontend/        # React 19 + Vite + TailwindCSS + TanStack Query + Framer Motion
│   └── backend/         # NestJS + Prisma ORM + Argon2 + Winston + Swagger OpenAPI
├── packages/
│   ├── types/           # Shared TypeScript Interfaces, Enums & DTOs
│   ├── shared/          # Shared Utilities, Formatters, & Phone Validators
│   └── ui/              # Shared React UI Component Library
├── prisma/              # Schema, Migrations, & Production Seeders
├── docs/                # Architecture, API, Database, & Deployment Documentation
├── vercel.json          # Vercel Frontend Deployment Config
└── render.yaml          # Render Backend Deployment Config
```

---

## 🛠️ Getting Started (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase PostgreSQL credentials and JWT secret.

### 3. Setup Database Schema & Seed Data
```bash
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend Service (NestJS - http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend App (Vite React - http://localhost:3000)
npm run dev:frontend
```

---

## 📚 Swagger API Documentation
Once the backend is running, open `http://localhost:5000/api/docs` to view interactive OpenAPI Swagger docs.

---

## 🛡️ License
Licensed by Central Bank of Kenya (CBK). ODPC Data Protection Compliant.
