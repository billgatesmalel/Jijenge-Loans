export interface StkPushParams {
  phoneNumber: string;
  amount: number;
  transactionRef: string;
  description: string;
  callbackUrl?: string;
}

export interface StkPushResponse {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  providerRef?: string;
  gatewayProvider: 'PALPLUSS' | 'GRAVITYPAY';
  rawResponse?: any;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  transactionRef?: string;
  checkoutRequestId?: string;
  mpesaReceipt?: string;
  amount?: number;
  resultCode?: string;
  resultDesc?: string;
  gatewayProvider?: 'PALPLUSS' | 'GRAVITYPAY';
  rawResponse?: any;
}

export interface WebhookResult {
  success: boolean;
  isSuccess: boolean;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' | 'PENDING';
  transactionRef?: string;
  checkoutRequestId?: string;
  mpesaReceipt?: string;
  amount?: number;
  phoneNumber?: string;
  resultCode?: string;
  resultDesc?: string;
  gatewayProvider: 'PALPLUSS' | 'GRAVITYPAY';
  rawResponse?: any;
}

export interface PalplussConfig {
  apiKey?: string;
  channelId?: string;
  webhookSecret?: string;
  apiUrl?: string;
  callbackBaseUrl?: string;
}

export interface GravityPayConfig {
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  apiUrl?: string;
  callbackBaseUrl?: string;
}

export interface ResolvedGatewayConfig {
  activeGateway: 'PALPLUSS' | 'GRAVITYPAY';
  palpluss: PalplussConfig;
  gravityPay: GravityPayConfig;
  callbackBackendBaseUrl?: string;
}

export interface PaymentGatewayProvider {
  readonly name: 'PALPLUSS' | 'GRAVITYPAY';
  initiateStkPush(params: StkPushParams, config: any): Promise<StkPushResponse>;
  queryStatus(checkoutRequestId: string, transactionRef?: string, config?: any): Promise<PaymentStatusResponse>;
  handleWebhook(payload: any, headers?: any, query?: any, config?: any): Promise<WebhookResult>;
}

/**
 * Sanitizes external gateway responses so raw HTML 404/500/Express error pages
 * are never dumped into error messages or user alerts.
 */
export function cleanGatewayErrorMessage(raw: any, defaultMsg = 'Payment gateway error'): string {
  if (!raw) return defaultMsg;
  let text = typeof raw === 'string' ? raw : raw?.message || raw?.error?.message || raw?.error || JSON.stringify(raw);
  if (typeof text !== 'string') return defaultMsg;

  // Check if text is HTML (e.g. 404/500/Express error page)
  if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<pre>') || text.includes('<body') || text.includes('<head>')) {
    // 1. Try extracting content inside <pre>...</pre> (common in Express 404/500 pages)
    const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch && preMatch[1]) {
      const preText = preMatch[1].replace(/<[^>]+>/g, '').trim();
      if (preText && preText.length < 150) return preText;
    }
    // 2. Try extracting content inside <title>...</title>
    const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      if (titleText && !titleText.toLowerCase().includes('error')) {
        return titleText;
      }
    }
    // 3. Fallback: strip all tags
    const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped.length > 0 && stripped.length < 120) {
      return stripped;
    }
    return defaultMsg;
  }

  if (text.length > 250) {
    text = text.substring(0, 250) + '...';
  }
  return text.trim() || defaultMsg;
}

/**
 * Verifies that a given credential is an actual live/test key rather than an empty
 * or placeholder value (e.g. "pk_live_your_...", "YOUR_PALPLUSS_API_KEY_HERE").
 */
export function isRealCredential(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  if (!clean) return false;
  const lower = clean.toLowerCase();
  if (
    lower.includes('your_') ||
    lower.includes('_here') ||
    lower.includes('example') ||
    lower.includes('sample') ||
    lower === 'your_palpluss_api_key_here' ||
    lower === 'pk_live_your_gravitypay_public_key' ||
    lower === 'sk_live_your_gravitypay_secret_key' ||
    lower === 'pk_live_jijenge_palpluss_api_key_here'
  ) {
    return false;
  }
  return clean.length >= 8;
}
