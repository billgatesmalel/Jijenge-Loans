# Jijenge Loans - Enterprise Fintech Loan Platform

**Jijenge Loans (Licensed by CBK)** is a modern commercial fintech web application for business growth loans in Kenya. Rebuilt and modernized from the Booster Loans repository into a high-performance full-stack application using **React 19**, **NestJS**, **TypeScript**, **Prisma ORM**, and **Neon Serverless PostgreSQL**.

---

## 🚀 Key Features

* **Instant STK Fee Payment**: Automated PalPluss M-Pesa STK Push fee collection with instant webhook verification (`/api/webhooks/mpesa`).
* **SMS Gateway Integration**: Capcom6 Android SMS Gateway (`api.sms-gate.app`) integration formatting phone numbers automatically to `+254` international format.
* **Customer Portal**: Phone + 4-Digit PIN authentication with Argon2 hashing, real-time allocated loan balance view, and instant M-Pesa withdrawal requests.
* **Super Admin Dashboard**: Full analytics KPIs (Total Revenue, Conversion Rate, Disbursed Loans), search & filter applications table, loan balance allocator, and system settings.
* **CBK Compliance & ODPC Data Protection**: Regulatory legal disclosures, data privacy controls, and 256-bit encrypted API communication.

---

## 📁 Architecture

```
Jijenge-Loans/
├── frontend/        # React 19 + Vite + TailwindCSS + TanStack Query + Framer Motion
├── backend/         # NestJS + Prisma ORM + Neon PostgreSQL + Argon2 + Swagger
├── docs/            # Architecture, API, Database, & Deployment Documentation
├── vercel.json      # Vercel Frontend Deployment Config
└── render.yaml      # Render Backend Deployment Config
```

---

## 🛠️ Getting Started (Local Development)

### 1. Configure Environment Variables
Copy `.env.example` to `.env` inside both `frontend/` and `backend/` directories, and add your Neon PostgreSQL connection strings.

### 2. Backend Setup & Prisma Generation
```bash
cd backend
npm install
npm run prisma:generate
npm run start:dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📚 Swagger API Documentation
Once the backend is running, open `http://localhost:5000/api/docs` to view interactive OpenAPI Swagger docs.

---

## 🛡️ License
Licensed by Central Bank of Kenya (CBK). ODPC Data Protection Compliant.
