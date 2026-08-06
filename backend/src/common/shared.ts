/* ==========================================================================
   Jijenge Loans - Backend Business Logic & Shared Utilities
   ========================================================================== */

export function formatKSh(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'KSh 0';
  return 'KSh ' + num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatLocalPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}

export function formatInternationalPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  return '+' + cleaned;
}

export function isValidKenyanPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');
  return /^(254|0)?(7|1)\d{8}$/.test(cleaned);
}

export function generateTransactionRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JJG-${randomStr}`;
}

export function calculateProcessingFee(amount: number): number {
  if (amount <= 10000) return 250;
  if (amount <= 25000) return 450;
  if (amount <= 50000) return 750;
  if (amount <= 100000) return 1200;
  return Math.round(amount * 0.015);
}

export const BRAND = {
  name: 'Jijenge Loans',
  legalName: 'Jijenge Loans Kenya Ltd',
  license: 'Licensed by Central Bank of Kenya (CBK)',
  supportPhone: '+254 700 123 456',
  supportEmail: 'support@jijengeloans.co.ke',
  website: 'https://jijengeloans.co.ke'
};
