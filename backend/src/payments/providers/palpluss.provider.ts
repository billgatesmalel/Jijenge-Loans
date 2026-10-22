import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  StkPushParams,
  StkPushResponse,
  PaymentStatusResponse,
  WebhookResult,
  PalplussConfig
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
    const apiKey = config.apiKey || process.env.PALPLUSS_API_KEY;
    const channelId = config.channelId || process.env.PALPLUSS_CHANNEL_ID || '1';
    const callbackBase =
      config.callbackBaseUrl ||
      process.env.PALPLUSS_CALLBACK_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://jijenge-loans-backend.onrender.com';
    const webhookSecret = config.webhookSecret || process.env.PALPLUSS_WEBHOOK_SECRET || 'jijenge_secret';
    const callbackUrl =
      params.callbackUrl ||
      `${callbackBase.replace(/\/$/, '')}/api/payments/callback/palpluss?secret=${encodeURIComponent(webhookSecret)}`;
    const primaryApiUrl =
      config.apiUrl ||
      process.env.PALPLUSS_API_URL ||
      'https://api.palpluss.com/v1/payments/stk';

    if (!apiKey) {
      throw new Error('Palplus API Key is not configured. Please supply palplussApiKey in settings or environment.');
    }

    const formattedPhone = this.formatPhone(params.phoneNumber);
    const authHeader =
      apiKey.startsWith('pk_') || apiKey.startsWith('pp_')
        ? `Basic ${apiKey}`
        : 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

    const payload = {
      apiKey,
      api_key: apiKey,
      channelId,
      channel_id: channelId,
      phone: formattedPhone,
      phone_number: formattedPhone,
      amount: params.amount,
      accountReference: params.transactionRef,
      account_reference: params.transactionRef,
      reference: params.transactionRef,
      transactionDesc: params.description || `Jijenge Loan Fee (${params.transactionRef})`,
      transaction_desc: params.description || `Jijenge Loan Fee (${params.transactionRef})`,
      callbackUrl,
      callback_url: callbackUrl,
      callback: callbackUrl,
      webhook_url: callbackUrl
    };

    const endpoints = Array.from(
      new Set([
        primaryApiUrl,
        'https://api.palpluss.com/v1/payments/stk',
        'https://palpluss.com/v1/payments/stk',
        'https://palpluss.com/api/v1/stkpush'
      ])
    );

    let lastError: any = null;
    let data: any = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('content-type') || '';
        let resData: any = null;
        if (contentType.includes('application/json')) {
          resData = await res.json();
        } else {
          const rawText = await res.text();
          resData = { message: rawText };
        }

        this.logger.log(`💳 [PALPLUSS STK TRY] Endpoint: ${endpoint} | Status: ${res.status}`);

        if (res.ok && resData.success !== false && !resData.error) {
          data = resData;
          break;
        } else {
          lastError = resData;
        }
      } catch (endpointErr: any) {
        this.logger.warn(`⚠️ [PALPLUSS API UNREACHABLE] Endpoint ${endpoint} failed: ${endpointErr.message}`);
        lastError = endpointErr;
      }
    }

    if (!data || data.success === false || data.error) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        lastError?.message ||
        'Palplus payment gateway request failed. Verify API key and account status.';
      this.logger.error(`❌ [PALPLUSS STK FAILURE] ${errMsg}`);
      throw new Error(errMsg);
    }

    const checkoutRequestId =
      data.checkout_request_id ||
      data.CheckoutRequestID ||
      data.providerCheckoutId ||
      data?.data?.providerCheckoutId ||
      data.tx_id ||
      data?.data?.transactionId ||
      data.id;

    const providerRef = data.tx_id || data?.data?.transactionId || data.id;

    return {
      success: true,
      message: data.message || 'STK Push sent successfully via Palplus. Enter M-Pesa PIN on your phone.',
      checkoutRequestId: checkoutRequestId ? String(checkoutRequestId) : undefined,
      providerRef: providerRef ? String(providerRef) : undefined,
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
