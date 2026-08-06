# Jijenge Loans - Developer Onboarding Guide

Welcome to the **Jijenge Loans** engineering team!

## Prerequisites
- Node.js LTS (v20+)
- npm v10+ or pnpm
- Git

## Quickstart Setup

1. **Clone & Install Dependencies**
   ```bash
   git clone <repo-url>
   cd Jijenge-Loans
   npm install
   ```

2. **Configure Local Environment**
   ```bash
   cp .env.example .env
   ```

3. **Prisma Setup**
   ```bash
   npm run prisma:generate
   ```

4. **Launch Dev Servers**
   ```bash
   # Terminal 1 - Backend (Port 5000)
   npm run dev:backend

   # Terminal 2 - Frontend (Port 3000)
   npm run dev:frontend
   ```

## Development Guidelines
- Always place shared interfaces in `packages/types`.
- Always place reusable utilities in `packages/shared`.
- Never commit secrets or `.env` files to git repository.
