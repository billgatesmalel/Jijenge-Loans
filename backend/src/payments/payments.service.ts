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
      }

      const apiKey = process.env.PALPLUSS_API_KEY;
      const channelId = process.env.PALPLUSS_CHANNEL_ID || '1';
      const callbackBaseUrl = process.env.PALPLUSS_CALLBACK_BASE_URL || 'https://jijengeloans.co.ke';
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
        callback_url: callbackUrl
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

      const checkoutRequestId = data.checkout_request_id || data.CheckoutRequestID || data.tx_id || data.CheckoutRequestID;

      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          checkoutRequestId: checkoutRequestId || null,
          palplussTxId: data.tx_id || data.id || null,
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

  async handleMpesaWebhook(body: any, secretQuery: string) {
    const expectedSecret = process.env.PALPLUSS_WEBHOOK_SECRET;
    if (expectedSecret && secretQuery !== expectedSecret) {
      this.logger.warn(`⚠️ [WEBHOOK REJECTED] Secret mismatch.`);
      return { success: false, error: 'Unauthorized webhook secret' };
    }

    this.logger.log(`📥 [MPESA WEBHOOK RECEIVED] Payload: ${JSON.stringify(body)}`);

    const checkoutRequestId = body.checkout_request_id || body.CheckoutRequestID;
    const accountRef = body.account_reference || body.AccountReference || body.tx_ref;
    const resultCode = String(body.result_code ?? body.ResultCode ?? '0');
    const resultDesc = body.result_desc || body.ResultDesc || 'Success';
    const mpesaReceipt = body.mpesa_receipt || body.MpesaReceiptNumber || body.receipt;

    const loan = await this.prisma.loanApplication.findFirst({
      where: {
        OR: [
          { checkoutRequestId: checkoutRequestId },
          { transactionRef: accountRef }
        ]
      }
    });

    if (!loan) {
      this.logger.warn(`⚠️ Loan application record not found for webhook checkout ID: ${checkoutRequestId}`);
      return { success: false, error: 'Loan record not found' };
    }

    if (resultCode === '0' || resultCode.toLowerCase() === 'success') {
      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          feeStatus: FeeStatus.Paid,
          status: LoanStatus.Application_Received,
          amountPaid: loan.processingFee,
          mpesaReceipt: mpesaReceipt || `MP${Date.now().toString().slice(-8)}`,
          resultCode,
          resultDesc,
          callbackReceivedAt: new Date()
        }
      });

      this.smsService.sendTemplateSms('FEE_PAYMENT_SUCCESS', loan.phoneNumber, {
        fullName: loan.fullName,
        txRef: loan.transactionRef,
        processingFee: (loan.processingFee || loan.fee || 450).toLocaleString()
      }).catch((e) => this.logger.error(e.message));

      return { success: true, message: 'Fee payment confirmed' };
    } else {
      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          feeStatus: FeeStatus.Failed,
          status: LoanStatus.Payment_Failed,
          feeResultDesc: resultDesc,
          resultCode,
          resultDesc,
          callbackReceivedAt: new Date()
        }
      });

      return { success: false, message: 'Fee payment failed' };
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
