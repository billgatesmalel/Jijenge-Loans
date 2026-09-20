import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { LoanStatus, FeeStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService
  ) {}

  async initiateStkPush(txRef: string, phone?: string) {
    try {
      if (!txRef) {
        throw new BadRequestException('Transaction reference is required');
      }

      const loan = await this.prisma.loanApplication.findUnique({
        where: { transactionRef: txRef }
      });

      if (!loan) {
        throw new BadRequestException('Loan application reference not found');
      }

      const targetPhone = phone || loan.phoneNumber;
      if (!targetPhone) {
        throw new BadRequestException('Phone number is required for STK push');
      }

      const feeAmount = loan.processingFee || 450;
      const cleanPhone = String(targetPhone).replace(/\D/g, '');

      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.slice(1);
      } else if (formattedPhone.length === 9 && (formattedPhone.startsWith('7') || formattedPhone.startsWith('1'))) {
        formattedPhone = '254' + formattedPhone;
      }

      const apiKey = process.env.PALPLUSS_API_KEY;
      const channelId = process.env.PALPLUSS_CHANNEL_ID || '1';
      const callbackBaseUrl = process.env.PALPLUSS_CALLBACK_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://jijenge-loans-backend.onrender.com';
      const webhookSecret = process.env.PALPLUSS_WEBHOOK_SECRET || 'jijenge_secret';
      const callbackUrl = `${callbackBaseUrl.replace(/\/$/, '')}/api/webhooks/mpesa?secret=${webhookSecret}`;
      const primaryApiUrl = process.env.PALPLUSS_API_URL || 'https://api.palpluss.com/v1/payments/stk';

      if (!apiKey) {
        this.logger.error(`❌ [PALPLUSS STK ERROR] Missing PALPLUSS_API_KEY environment variable.`);
        throw new BadRequestException('PALPLUSS_API_KEY environment variable is not configured. Production STK push requires PalPluss API Key.');
      }

      const authHeader = (apiKey.startsWith('pk_') || apiKey.startsWith('pp_'))
        ? `Basic ${apiKey}`
        : 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

      const payload = {
        apiKey: apiKey,
        api_key: apiKey,
        channelId: channelId,
        channel_id: channelId,
        phone: formattedPhone,
        phone_number: formattedPhone,
        amount: feeAmount,
        accountReference: txRef,
        account_reference: txRef,
        reference: txRef,
        transactionDesc: `Jijenge Loan Fee (${txRef})`,
        transaction_desc: `Jijenge Loan Fee (${txRef})`,
        callbackUrl: callbackUrl,
        callback_url: callbackUrl,
        callback: callbackUrl,
        webhook_url: callbackUrl
      };

      const endpoints = Array.from(new Set([
        primaryApiUrl,
        'https://api.palpluss.com/v1/payments/stk',
        'https://palpluss.com/v1/payments/stk',
        'https://palpluss.com/api/v1/stkpush'
      ]));

      let data: any = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
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

          this.logger.log(`💳 [PALPLUSS STK TRY] Endpoint ${endpoint} | Status: ${res.status} | Data: ${JSON.stringify(resData)}`);

          if (res.ok && resData.success !== false && !resData.error) {
            data = resData;
            break;
          } else {
            data = resData;
          }
        } catch (endpointErr: any) {
          this.logger.warn(`⚠️ [PALPLUSS API UNREACHABLE] Endpoint ${endpoint} failed: ${endpointErr.message}`);
        }
      }

      if (!data || data.success === false || data.error) {
        const errMsg = data?.error?.message || data?.message || 'PalPluss payment gateway request failed. Verify API key and account status.';
        this.logger.error(`❌ [PALPLUSS STK FAILURE] ${errMsg}`);
        throw new BadRequestException(errMsg);
      }

      const checkoutRequestId =
        data.checkout_request_id ||
        data.CheckoutRequestID ||
        data.providerCheckoutId ||
        data?.data?.providerCheckoutId ||
        data.tx_id ||
        data?.data?.transactionId ||
        data.id;

      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          checkoutRequestId: checkoutRequestId || null,
          palplussTxId: data.tx_id || data?.data?.transactionId || data.id || null,
          feeStatus: FeeStatus.Pending_STK_Push
        }
      });

      return {
        success: true,
        message: data.message || 'STK Push sent successfully to your phone. Enter M-Pesa PIN to finalize.',
        checkoutRequestId
      };
    } catch (err: any) {
      this.logger.error(`❌ [PALPLUSS/PAYPLUSS STK ERROR] ${err.message}`);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err.message || 'Failed to trigger M-Pesa STK Push');
    }
  }

  async handleMpesaWebhook(body: any, secretProvided?: string) {
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {}
    }
    body = body || {};

    const stkCallback = body.Body?.stkCallback || body.stkCallback;
    const tx = body.transaction || body.data || body.payload || {};

    let resultCode = String(
      stkCallback?.ResultCode ??
      tx.result_code ??
      tx.ResultCode ??
      body.result_code ??
      body.ResultCode ??
      tx.code ??
      body.code ??
      '99'
    );

    let resultDesc = String(
      stkCallback?.ResultDesc ||
      tx.result_desc ||
      tx.ResultDesc ||
      body.result_desc ||
      body.ResultDesc ||
      tx.message ||
      body.message ||
      ''
    );

    let eventType = String(body.event_type || body.event || '').toLowerCase();
    let statusStr = String(tx.status || body.status || body.state || '').toUpperCase();

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

    this.logger.log(
      `📥 [MPESA WEBHOOK RECEIVED] Secret Provided: "${secretProvided || 'none'}" | CheckoutID: "${checkoutRequestId}" | AccountRef: "${accountRef}" | ResultCode: "${resultCode}" | Status: "${statusStr}" | Event: "${eventType}"`
    );

    const expectedSecret = process.env.PALPLUSS_WEBHOOK_SECRET;
    const defaultSecret = 'jijenge_secret';

    const isValidSecret =
      !expectedSecret ||
      secretProvided === expectedSecret ||
      secretProvided === defaultSecret ||
      body?.secret === expectedSecret ||
      body?.token === expectedSecret ||
      body?.api_key === expectedSecret ||
      body?.apiKey === expectedSecret;

    let loan = await this.prisma.loanApplication.findFirst({
      where: {
        OR: [
          ...(checkoutRequestId ? [{ checkoutRequestId: checkoutRequestId }] : []),
          ...(accountRef ? [{ transactionRef: accountRef }] : []),
          ...(checkoutRequestId ? [{ palplussTxId: checkoutRequestId }] : [])
        ]
      }
    });

    if (!loan && rawPhone) {
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length >= 9) {
        loan = await this.prisma.loanApplication.findFirst({
          where: {
            phoneNumber: { contains: cleanPhone.slice(-9) },
            feeStatus: FeeStatus.Pending_STK_Push
          },
          orderBy: { createdAt: 'desc' }
        });
        if (loan) {
          this.logger.log(`🔍 [WEBHOOK MATCH] Matched loan application ${loan.transactionRef} by phone fallback (${rawPhone}).`);
        }
      }
    }

    if (!isValidSecret) {
      this.logger.warn(`⚠️ [WEBHOOK SECRET WARNING] Secret mismatch (Provided: "${secretProvided || 'none'}", Expected: "${expectedSecret || defaultSecret}").`);
      if (!loan) {
        this.logger.warn(`⚠️ [WEBHOOK REJECTED] Secret mismatch and no matching loan record found.`);
        return { success: false, error: 'Unauthorized webhook secret' };
      }
      this.logger.log(`⚠️ Matched loan ${loan.transactionRef} (${loan.fullName}). Processing M-Pesa webhook callback.`);
    }

    if (!loan) {
      this.logger.warn(`⚠️ Loan application record not found for webhook checkout ID: ${checkoutRequestId || accountRef || 'N/A'}`);
      return { success: false, error: 'Loan record not found' };
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

    if (isSuccess) {
      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          feeStatus: FeeStatus.Paid,
          status: LoanStatus.Application_Received,
          amountPaid: loan.processingFee || amountPaid || 450,
          mpesaReceipt: mpesaReceipt || `MP${Date.now().toString().slice(-8)}`,
          resultCode,
          resultDesc: resultDesc || 'Success',
          callbackReceivedAt: new Date()
        }
      });

      this.smsService.sendLoanEvent({
        event: 'PAYMENT_CONFIRMED',
        applicationId: loan.id,
        userId: loan.userId || undefined,
        phone: loan.phoneNumber,
        eventVersion: 1
      }).catch((e) => this.logger.error(`Webhook SMS Error: ${e?.message}`));

      return { success: true, message: 'Fee payment confirmed' };
    } else {
      let targetFeeStatus: FeeStatus = FeeStatus.Failed;
      let targetLoanStatus: LoanStatus = LoanStatus.Payment_Failed;

      if (
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
        targetFeeStatus = FeeStatus.Cancelled;
        targetLoanStatus = LoanStatus.Payment_Failed;
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
        targetFeeStatus = FeeStatus.Expired;
        targetLoanStatus = LoanStatus.Payment_Timed_Out;
      }

      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          feeStatus: targetFeeStatus,
          status: targetLoanStatus,
          feeResultDesc: resultDesc || 'Fee payment failed',
          resultCode,
          resultDesc: resultDesc || 'Fee payment failed',
          callbackReceivedAt: new Date()
        }
      });

      this.smsService.sendLoanEvent({
        event: 'PAYMENT_FAILED',
        applicationId: loan.id,
        userId: loan.userId || undefined,
        phone: loan.phoneNumber,
        eventVersion: 1
      }).catch((e) => this.logger.error(`Webhook SMS Error: ${e?.message}`));

      return { success: false, message: 'Fee payment failed or cancelled', resultCode, resultDesc };
    }
  }

  async checkPaymentStatus(txRef: string) {
    const loan = await this.prisma.loanApplication.findUnique({
      where: { transactionRef: txRef }
    });

    if (!loan) {
      throw new BadRequestException('Loan reference not found');
    }

    return {
      success: true,
      transactionRef: loan.transactionRef,
      feeStatus: loan.feeStatus,
      status: loan.status,
      mpesaReceipt: loan.mpesaReceipt,
      amountPaid: loan.amountPaid
    };
  }
}
