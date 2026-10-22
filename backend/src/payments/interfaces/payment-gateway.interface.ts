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
