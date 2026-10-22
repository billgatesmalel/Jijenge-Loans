import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  StkPushParams,
  StkPushResponse,
  PaymentStatusResponse,
  WebhookResult,
  PalplussConfig,
  cleanGatewayErrorMessage
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class PalplussProvider implements PaymentGatewayProvider {
  readonly name = 'PALPLUSS' as const;
  private readonly logger = new Logger(PalplussProvider.name);

  private formatPhone(phone: string): string {
    let clean = String(phone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
      clean = '254' + clean;
    }
    return clean;
  }

  async initiateStkPush(params: StkPushParams, config: PalplussConfig): Promise<StkPushResponse> {
    const apiKey = (config.apiKey || process.env.PALPLUSS_API_KEY || '').trim();
    const channelId = (config.channelId || process.env.PALPLUSS_CHANNEL_ID || '1').trim();
    const callbackBase =
      config.callbackBaseUrl ||
      process.env.CALLBACK_BACKEND_BASE_URL ||
      process.env.PALPLUSS_CALLBACK_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://jijenge-loans-backend.onrender.com';
    const webhookSecret = config.webhookSecret || process.env.PALPLUSS_WEBHOOK_SECRET || 'jijenge_secret';
    const callbackUrl =
      params.callbackUrl ||
      `${callbackBase.replace(/\/$/, '')}/api/payments/callback/palpluss?secret=${encodeURIComponent(webhookSecret)}`;
    const configuredApiUrl = (config.apiUrl || process.env.PALPLUSS_API_URL || 'https://api.palpluss.com/v1/payments/stk').trim();

    if (!apiKey) {
      throw new Error('Palplus API Key is not configured. Please supply palplussApiKey in settings or environment.');
    }

    const formattedPhone = this.formatPhone(params.phoneNumber);
    const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Bearer ')
      ? apiKey
      : 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

    let cleanRef = String(params.transactionRef || '').replace(/[^A-Za-z0-9]/g, '').trim();
    if (!cleanRef) {
      cleanRef = 'JJG' + Math.floor(100000 + Math.random() * 900000);
    } else if (cleanRef.length > 12) {
      cleanRef = cleanRef.substring(0, 12);
    }

    const amountInt = Math.max(1, parseInt(String(params.amount), 10) || 1);

    const payload: any = {
      apiKey,
      api_key: apiKey,
      channelId,
      channel_id: channelId,
      phone: formattedPhone,
      phone_number: formattedPhone,
      amount: amountInt,
      accountReference: cleanRef,
      account_reference: cleanRef,
      reference: cleanRef,
      transactionDesc: String(params.description || `Loan Fee ${cleanRef}`).substring(0, 30),
      transaction_desc: String(params.description || `Loan Fee ${cleanRef}`).substring(0, 30),
      callbackUrl,
      callback_url: callbackUrl
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
      'x-api-key': apiKey
    };

    if (channelId) {
      headers['x-channel-id'] = channelId;
      headers['channel-id'] = channelId;
    }

    // Ensure endpoint targets the Palpluss API host (never palpluss.com web application)
    const endpoint = configuredApiUrl.includes('palpluss.com') && !configuredApiUrl.includes('api.palpluss.com')
      ? 'https://api.palpluss.com/v1/payments/stk'
      : configuredApiUrl;

    this.logger.log(`💳 [PALPLUSS STK DISPATCH] Endpoint: ${endpoint} | Ref: ${cleanRef} | Phone: ${formattedPhone} | Amount: ${amountInt}`);

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
        const cleaned = cleanGatewayErrorMessage(rawText, `Palplus service error (HTTP ${resStatus})`);
        data = { message: cleaned };
      }
    } catch (endpointErr: any) {
      this.logger.error(`❌ [PALPLUSS NETWORK ERROR] ${endpointErr.message}`);
      throw new Error(`Palplus network error: ${endpointErr.message}`);
    }

    if (resStatus >= 400 || !data || data.success === false || data.error) {
      const errMsg = cleanGatewayErrorMessage(
        data?.error?.message || data?.message || data?.error,
        `Palplus STK initiation failed (HTTP ${resStatus || 500})`
      );
      this.logger.error(`❌ [PALPLUSS STK FAILURE] HTTP ${resStatus} | Error: ${errMsg}`);
      throw new Error(errMsg);
    }

    const checkoutRequestId =
      data.checkout_request_id ||
      data.CheckoutRequestID ||
      data.providerCheckoutId ||
      data?.data?.providerCheckoutId ||
      data.tx_id ||
      data?.data?.transactionId ||
      data.id ||
      cleanRef;

    return {
      success: true,
      message: data.message || 'STK Push sent successfully via Palplus. Please enter your M-Pesa PIN.',
      checkoutRequestId: checkoutRequestId ? String(checkoutRequestId) : undefined,
      providerRef: data.tx_id || data?.data?.transactionId || data.id ? String(data.tx_id || data?.data?.transactionId || data.id) : undefined,
      gatewayProvider: 'PALPLUSS',
      rawResponse: data
    };
  }

  async queryStatus(
    checkoutRequestId: string,
    transactionRef?: string,
    config?: PalplussConfig
  ): Promise<PaymentStatusResponse> {
    const apiKey = config?.apiKey || process.env.PALPLUSS_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        status: 'PENDING',
        transactionRef,
        checkoutRequestId,
        gatewayProvider: 'PALPLUSS',
        resultDesc: 'Palplus API key not configured'
      };
    }

    const queryUrl = `https://api.palpluss.com/v1/payments/status/${checkoutRequestId || transactionRef}`;
    try {
      const authHeader =
        apiKey.startsWith('pk_') || apiKey.startsWith('pp_')
          ? `Basic ${apiKey}`
          : 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

      const res = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const body = await res.json();
        const statusStr = String(body.status || body.state || '').toUpperCase();
        let status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' = 'PENDING';
        if (['SUCCESS', 'COMPLETED', 'PAID'].includes(statusStr)) status = 'SUCCESS';
        else if (['FAILED', 'REJECTED'].includes(statusStr)) status = 'FAILED';
        else if (['CANCELLED', 'CANCELED'].includes(statusStr)) status = 'CANCELLED';
        else if (['TIMEOUT', 'TIMED_OUT', 'EXPIRED'].includes(statusStr)) status = 'TIMED_OUT';

        return {
          success: true,
          status,
          transactionRef,
          checkoutRequestId,
          mpesaReceipt: body.mpesa_receipt || body.mpesaReceipt,
          amount: body.amount ? parseFloat(body.amount) : undefined,
          resultCode: String(body.result_code || ''),
          resultDesc: body.result_desc || body.message,
          gatewayProvider: 'PALPLUSS',
          rawResponse: body
        };
      }
    } catch (e: any) {
      this.logger.warn(`[PALPLUSS QUERY STATUS] Could not query remote status: ${e.message}`);
    }

    return {
      success: true,
      status: 'PENDING',
      transactionRef,
      checkoutRequestId,
      gatewayProvider: 'PALPLUSS'
    };
  }

  async handleWebhook(
    payload: any,
    headers: any = {},
    query: any = {},
    config?: PalplussConfig
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

    const stkCallback = body.Body?.stkCallback || body.stkCallback;
    const tx = body.transaction || body.data || body.payload || {};

    const resultCode = String(
      stkCallback?.ResultCode ??
      tx.result_code ??
      tx.ResultCode ??
      body.result_code ??
      body.ResultCode ??
      tx.code ??
      body.code ??
      '99'
    );

    const resultDesc = String(
      stkCallback?.ResultDesc ||
      tx.result_desc ||
      tx.ResultDesc ||
      body.result_desc ||
      body.ResultDesc ||
      tx.message ||
      body.message ||
      ''
    );

    const eventType = String(body.event_type || body.event || '').toLowerCase();
    const statusStr = String(tx.status || body.status || body.state || '').toUpperCase();

    let checkoutRequestId = String(
      stkCallback?.CheckoutRequestID ||
      tx.id ||
      tx.provider_checkout_id ||
      tx.checkout_request_id ||
      tx.CheckoutRequestID ||
      tx.transactionId ||
      tx.transaction_id ||
      body.checkout_request_id ||
      body.CheckoutRequestID ||
      body.providerCheckoutId ||
      body.transactionId ||
      body.transaction_id ||
      ''
    );
    if (checkoutRequestId === 'undefined' || checkoutRequestId === 'null') checkoutRequestId = '';

    let accountRef = String(
      tx.external_reference ||
      tx.accountReference ||
      tx.account_reference ||
      tx.reference ||
      body.accountReference ||
      body.account_reference ||
      body.accountRef ||
      body.tx_ref ||
      body.reference ||
      ''
    );
    if (accountRef === 'undefined' || accountRef === 'null') accountRef = '';

    let mpesaReceipt = '';
    let rawPhone = '';
    let amountPaid = 0;

    if (stkCallback?.CallbackMetadata?.Item && Array.isArray(stkCallback.CallbackMetadata.Item)) {
      for (const item of stkCallback.CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber' && item.Value) mpesaReceipt = String(item.Value);
        if (item.Name === 'PhoneNumber' && item.Value) rawPhone = String(item.Value);
        if (item.Name === 'Amount' && item.Value) amountPaid = parseFloat(item.Value);
      }
    }

    if (!rawPhone) {
      rawPhone = String(tx.phone_number || tx.phone || tx.PhoneNumber || body.phone || body.phone_number || '');
    }

    if (!mpesaReceipt) {
      mpesaReceipt = String(
        tx.mpesa_receipt ||
        tx.MpesaReceiptNumber ||
        tx.receipt ||
        body.mpesa_receipt ||
        body.MpesaReceiptNumber ||
        body.receipt ||
        ''
      );
    }

    if (!amountPaid && (tx.amount || body.amount)) {
      amountPaid = parseFloat(tx.amount || body.amount) || 0;
    }

    const descLower = resultDesc.toLowerCase();
    const isSuccess =
      (resultCode === '0' ||
        statusStr === 'SUCCESS' ||
        statusStr === 'COMPLETED' ||
        statusStr === 'PAID' ||
        eventType === 'transaction.success' ||
        eventType === 'payment.success') &&
      statusStr !== 'FAILED' &&
      statusStr !== 'CANCELLED' &&
      statusStr !== 'CANCELED' &&
      statusStr !== 'EXPIRED' &&
      statusStr !== 'REJECTED';

    let status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' = 'FAILED';

    if (isSuccess) {
      status = 'SUCCESS';
    } else if (
      resultCode === '1032' ||
      resultCode === '2001' ||
      statusStr === 'CANCELLED' ||
      statusStr === 'CANCELED' ||
      eventType === 'transaction.cancelled' ||
      descLower.includes('cancel') ||
      descLower.includes('wrong pin') ||
      descLower.includes('invalid pin') ||
      descLower.includes('user cancel')
    ) {
      status = 'CANCELLED';
    } else if (
      resultCode === '1037' ||
      resultCode === '1025' ||
      statusStr === 'EXPIRED' ||
      statusStr === 'TIMEOUT' ||
      statusStr === 'TIMED_OUT' ||
      eventType === 'transaction.expired' ||
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
      transactionRef: accountRef || undefined,
      checkoutRequestId: checkoutRequestId || undefined,
      mpesaReceipt: mpesaReceipt || undefined,
      amount: amountPaid || undefined,
      phoneNumber: rawPhone || undefined,
      resultCode,
      resultDesc,
      gatewayProvider: 'PALPLUSS',
      rawResponse: body
    };
  }
}
