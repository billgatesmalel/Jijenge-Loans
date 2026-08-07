# Jijenge Loans - Production Deployment Guide

## 1. Vercel Deployment (Frontend)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set Root Directory to `Jijenge-Loans`.
3. Vercel automatically detects `vercel.json`.
4. Build Command: `npm run build`
5. Output Directory: `apps/frontend/dist`
6. Set Environment Variable:
   - `VITE_API_URL`: Your Render backend deployment URL (e.g. `https://jijenge-loans.onrender.com`).

## 2. Render Deployment (Backend)

1. Connect your repository to [Render](https://render.com).
2. Render will automatically parse `render.yaml`.
3. Set environment secrets in Render Dashboard:
   - `DATABASE_URL`: Supabase Transaction Pooler URL (Port 6543)
   - `DIRECT_URL`: Supabase Direct URL (Port 5432)
   - `JWT_SECRET`: Random 32+ character secret string
   - `PALPLUSS_API_KEY`: Live PalPluss key
   - `PALPLUSS_WEBHOOK_SECRET`: Signature secret

## 3. Database Migration on Production
Run Prisma migration against Supabase from your CLI:
```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
```
