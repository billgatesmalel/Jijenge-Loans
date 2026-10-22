import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  StkPushParams,
  StkPushResponse,
  PaymentStatusResponse,
  WebhookResult,
  GravityPayConfig,
  cleanGatewayErrorMessage
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class GravityPayProvider implements PaymentGatewayProvider {
  readonly name = 'GRAVITYPAY' as const;
  private readonly logger = new Logger(GravityPayProvider.name);

  /**
   * GravityPay accepts phone numbers formatted as either 2547XXXXXXXX or 07XXXXXXXX.
   * We format standard 254... and 07... representations.
   */
  private formatPhones(phone: string): { international: string; local: string } {
    let clean = String(phone || '').replace(/\D/g, '');
    let international = clean;
    let local = clean;

    if (clean.startsWith('254') && clean.length === 12) {
      international = clean;
      local = '0' + clean.slice(3);
    } else if (clean.startsWith('0') && clean.length === 10) {
      local = clean;
      international = '254' + clean.slice(1);
    } else if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
      international = '254' + clean;
      local = '0' + clean;
    }

    return { international, local };
  }

  async initiateStkPush(params: StkPushParams, config: GravityPayConfig): Promise<StkPushResponse> {
    const publicKey = (config.publicKey || process.env.GRAVITYPAY_PUBLIC_KEY || '').trim();
    const secretKey = (config.secretKey || process.env.GRAVITYPAY_SECRET_KEY || '').trim();
    const callbackBase =
      config.callbackBaseUrl ||
      process.env.CALLBACK_BACKEND_BASE_URL ||
      process.env.GRAVITYPAY_CALLBACK_BASE_URL ||
      process.env.PALPLUSS_CALLBACK_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://jijenge-loans-backend.onrender.com';
    const webhookSecret = config.webhookSecret || process.env.GRAVITYPAY_WEBHOOK_SECRET || 'jijenge_gravity_secret';
    const callbackUrl =
      params.callbackUrl ||
      `${callbackBase.replace(/\/$/, '')}/api/payments/callback/gravitypay?secret=${encodeURIComponent(webhookSecret)}`;
    const baseUrl = (config.apiUrl || process.env.GRAVITYPAY_API_URL || 'https://api.gravitypayapp.com').replace(/\/$/, '');

    if (!publicKey && !secretKey) {
      throw new Error('GravityPay credentials missing. Please configure GravityPay Public Key and Secret Key in settings.');
    }

    const { international } = this.formatPhones(params.phoneNumber);

    // GravityPay strict rule: reference must be strictly 1-12 alphanumeric characters!
    let cleanRef = String(params.transactionRef || '').replace(/[^A-Za-z0-9]/g, '').trim();
    if (!cleanRef) {
      cleanRef = 'JJG' + Math.floor(100000 + Math.random() * 900000);
    }
    if (cleanRef.length > 12) {
      cleanRef = cleanRef.substring(0, 12);
    }

    const amountInt = Math.max(1, parseInt(String(params.amount), 10) || 1);
    const authBearer = secretKey ? (secretKey.startsWith('Bearer ') ? secretKey : `Bearer ${secretKey}`) : undefined;

    const payload: any = {
      phoneNumber: international,
      amount: amountInt,
      reference: cleanRef,
      description: String(params.description || `Loan Fee ${cleanRef}`).substring(0, 20),
      callbackUrl,
      metadata: {
        source: 'jijenge-loans',
        fullRef: params.transactionRef,
        timestamp: new Date().toISOString()
      }
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (authBearer) {
      headers['Authorization'] = authBearer;
    }
    if (publicKey) {
      headers['x-api-key'] = publicKey;
      headers['X-Public-Key'] = publicKey;
    }
    if (secretKey) {
      headers['X-Secret-Key'] = secretKey;
    }

    // Only legitimate GravityPay STK push endpoint
    const endpoint = baseUrl.includes('/api/v1') ? baseUrl : `${baseUrl}/api/v1/stk/push`;

    this.logger.log(`💳 [GRAVITYPAY STK DISPATCH] Endpoint: ${endpoint} | Ref: ${cleanRef} | Phone: ${international} | Amount: ${amountInt}`);

    let data: any = null;
    let resStatus = 0;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      resStatus = res.status;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        const cleaned = cleanGatewayErrorMessage(rawText, `GravityPay service error (HTTP ${resStatus})`);
        data = { message: cleaned };
      }
    } catch (fetchErr: any) {
      this.logger.error(`❌ [GRAVITYPAY NETWORK ERROR] ${fetchErr.message}`);
      throw new Error(`GravityPay network error: ${fetchErr.message}`);
    }

    if (resStatus >= 400 || !data || data.success === false || data.error) {
      const errMsg = cleanGatewayErrorMessage(
        data?.message || data?.error?.message || data?.error,
        `GravityPay STK initiation failed (HTTP ${resStatus || 500})`
      );
      this.logger.error(`❌ [GRAVITYPAY STK FAILURE] HTTP ${resStatus} | Error: ${errMsg}`);
      throw new Error(errMsg);
    }

    const checkoutRequestId =
      data.checkoutRequestId ||
      data.checkout_request_id ||
      data.CheckoutRequestID ||
      data.transactionId ||
      data.transaction_id ||
      data.referenceId ||
      data.id ||
      data?.data?.checkoutRequestId ||
      data?.data?.transactionId ||
      data?.data?.id ||
      cleanRef;

    const providerRef =
      data.reference ||
      data.providerRef ||
      data.transactionId ||
      data.tx_id ||
      data?.data?.transactionId ||
      cleanRef;

    return {
      success: true,
      message: data.message || 'STK Push sent successfully via GravityPay. Please enter your M-Pesa PIN.',
      checkoutRequestId: checkoutRequestId ? String(checkoutRequestId) : undefined,
      providerRef: providerRef ? String(providerRef) : undefined,
      gatewayProvider: 'GRAVITYPAY',
      rawResponse: data
    };
  }

  async queryStatus(
    checkoutRequestId: string,
    transactionRef?: string,
    config?: GravityPayConfig
  ): Promise<PaymentStatusResponse> {
    const publicKey = config?.publicKey || process.env.GRAVITYPAY_PUBLIC_KEY;
    const secretKey = config?.secretKey || process.env.GRAVITYPAY_SECRET_KEY;
    const baseUrl = (config?.apiUrl || process.env.GRAVITYPAY_API_URL || 'https://api.gravitypayapp.com').replace(/\/$/, '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (publicKey) headers['X-Public-Key'] = publicKey;
    if (secretKey) {
      headers['X-Secret-Key'] = secretKey;
      headers['Authorization'] = `Bearer ${secretKey}`;
    }

    const queryEndpoints = [
      `${baseUrl}/api/v1/stk/status/${encodeURIComponent(checkoutRequestId || transactionRef || '')}`,
      `${baseUrl}/v1/payments/query?reference=${encodeURIComponent(transactionRef || checkoutRequestId || '')}`
    ];

    for (const endpoint of queryEndpoints) {
      try {
        const res = await fetch(endpoint, { method: 'GET', headers });
        if (res.ok) {
          const body = await res.json();
          const tx = body.data || body.transaction || body;
          const statusStr = String(tx.status || tx.state || '').toUpperCase();
          const isSuccess = ['SUCCESS', 'PAID', 'COMPLETED', 'SETTLED'].includes(statusStr) || tx.resultCode === '0' || tx.result_code === 0;

          let status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' = 'PENDING';
          if (isSuccess) status = 'SUCCESS';
          else if (['FAILED', 'DECLINED', 'REJECTED'].includes(statusStr)) status = 'FAILED';
          else if (['CANCELLED', 'CANCELED'].includes(statusStr)) status = 'CANCELLED';
          else if (['TIMEOUT', 'TIMED_OUT', 'EXPIRED'].includes(statusStr)) status = 'TIMED_OUT';

          return {
            success: true,
            status,
            transactionRef: tx.reference || tx.transactionRef || transactionRef,
            checkoutRequestId: tx.checkoutRequestId || checkoutRequestId,
            mpesaReceipt: tx.mpesaReceipt || tx.mpesa_receipt || tx.receiptNumber || tx.receipt,
            amount: tx.amount ? parseFloat(tx.amount) : undefined,
            resultCode: String(tx.resultCode ?? tx.result_code ?? ''),
            resultDesc: tx.resultDesc || tx.result_desc || tx.message,
            gatewayProvider: 'GRAVITYPAY',
            rawResponse: body
          };
        }
      } catch (e: any) {
        this.logger.warn(`[GRAVITYPAY QUERY STATUS] Query failed on ${endpoint}: ${e.message}`);
      }
    }

    return {
      success: true,
      status: 'PENDING',
      transactionRef,
      checkoutRequestId,
      gatewayProvider: 'GRAVITYPAY'
    };
  }

  async handleWebhook(
    payload: any,
    headers: any = {},
    query: any = {},
    config?: GravityPayConfig
  ): Promise<WebhookResult> {
    let body = payload;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const expectedSecret = config?.webhookSecret || process.env.GRAVITYPAY_WEBHOOK_SECRET;
    const providedSecret =
      query?.secret ||
      query?.token ||
      headers?.['x-webhook-secret'] ||
      headers?.['x-gravity-secret'] ||
      headers?.['x-gravity-signature'] ||
      headers?.['x-api-key'] ||
      body?.secret ||
      body?.webhookSecret ||
      body?.token;

    if (expectedSecret && providedSecret && providedSecret !== expectedSecret) {
      this.logger.warn(`⚠️ [GRAVITYPAY WEBHOOK] Secret mismatch: expected "${expectedSecret}", got "${providedSecret}"`);
    }

    // Unpack potential wrapped payloads
    const tx = body.data || body.transaction || body.payload || body;
    const stkCallback = body.Body?.stkCallback || body.stkCallback;

    // Extract transaction reference
    const transactionRef = String(
      tx.reference ||
      tx.transactionRef ||
      tx.accountReference ||
      tx.account_reference ||
      tx.orderId ||
      body.reference ||
      body.transactionRef ||
      body.accountReference ||
      body.tx_ref ||
      ''
    );

    // Extract checkoutRequestId / provider transaction ID
    const checkoutRequestId = String(
      tx.checkoutRequestId ||
      tx.checkout_request_id ||
      tx.transactionId ||
      tx.transaction_id ||
      tx.id ||
      stkCallback?.CheckoutRequestID ||
      body.checkoutRequestId ||
      body.checkout_request_id ||
      ''
    );

    // Extract M-Pesa Receipt Number
    let mpesaReceipt = String(
      tx.mpesaReceipt ||
      tx.mpesa_receipt ||
      tx.receiptNumber ||
      tx.receipt ||
      tx.mpesaCode ||
      tx.mpesa_code ||
      tx.transactionCode ||
      body.mpesaReceipt ||
      body.mpesa_receipt ||
      body.receipt ||
      ''
    );

    // Extract phone number
    let phoneNumber = String(
      tx.phoneNumber ||
      tx.phone_number ||
      tx.phone ||
      tx.msisdn ||
      tx.customerPhone ||
      body.phoneNumber ||
      body.phone ||
      ''
    );

    // Extract amount
    let amount = 0;
    if (tx.amount) amount = parseFloat(tx.amount);
    else if (body.amount) amount = parseFloat(body.amount);

    // Check CallbackMetadata if present
    if (stkCallback?.CallbackMetadata?.Item && Array.isArray(stkCallback.CallbackMetadata.Item)) {
      for (const item of stkCallback.CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber' && item.Value) mpesaReceipt = String(item.Value);
        if (item.Name === 'PhoneNumber' && item.Value) phoneNumber = String(item.Value);
        if (item.Name === 'Amount' && item.Value) amount = parseFloat(item.Value);
      }
    }

    const resultCode = String(
      tx.resultCode ??
      tx.result_code ??
      stkCallback?.ResultCode ??
      body.resultCode ??
      body.result_code ??
      body.code ??
      '0'
    );

    const resultDesc = String(
      tx.resultDesc ||
      tx.result_desc ||
      tx.message ||
      stkCallback?.ResultDesc ||
      body.resultDesc ||
      body.result_desc ||
      body.message ||
      ''
    );

    const statusStr = String(tx.status || body.status || body.event || '').toUpperCase();
    const descLower = resultDesc.toLowerCase();

    const isSuccess =
      (resultCode === '0' ||
        ['SUCCESS', 'PAID', 'COMPLETED', 'SETTLED', 'SUCCESSFUL'].includes(statusStr) ||
        body.event === 'payment.success' ||
        body.event === 'transaction.success') &&
      !['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED', 'DECLINED'].includes(statusStr);

    let status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' = 'FAILED';

    if (isSuccess) {
      status = 'SUCCESS';
    } else if (
      resultCode === '1032' ||
      resultCode === '2001' ||
      ['CANCELLED', 'CANCELED', 'DECLINED'].includes(statusStr) ||
      descLower.includes('cancel') ||
      descLower.includes('wrong pin') ||
      descLower.includes('invalid pin') ||
      descLower.includes('user cancel')
    ) {
      status = 'CANCELLED';
    } else if (
      resultCode === '1037' ||
      resultCode === '1025' ||
      ['TIMEOUT', 'TIMED_OUT', 'EXPIRED'].includes(statusStr) ||
      descLower.includes('timed out') ||
      descLower.includes('timeout') ||
      descLower.includes('expired')
    ) {
      status = 'TIMED_OUT';
    }

    return {
      success: true,
      isSuccess,
      status,
      transactionRef: transactionRef || undefined,
      checkoutRequestId: checkoutRequestId || undefined,
      mpesaReceipt: mpesaReceipt || undefined,
      amount: amount || undefined,
      phoneNumber: phoneNumber || undefined,
      resultCode,
      resultDesc,
      gatewayProvider: 'GRAVITYPAY',
      rawResponse: body
    };
  }
}
