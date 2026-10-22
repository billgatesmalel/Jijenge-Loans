import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { PaymentGatewayManager } from './payment-gateway.manager';
import { LoanStatus, FeeStatus } from '@prisma/client';
import { WebhookResult, cleanGatewayErrorMessage } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly gatewayManager: PaymentGatewayManager
  ) {}

  /**
   * Initiate STK Push using the active gateway (with automatic failover)
   */
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

      const stkResult = await this.gatewayManager.initiateStkPush({
        phoneNumber: targetPhone,
        amount: feeAmount,
        transactionRef: txRef,
        description: `Jijenge Loan Fee (${txRef})`
      });

      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          checkoutRequestId: stkResult.checkoutRequestId || null,
          palplussTxId: stkResult.providerRef || null,
          gatewayProvider: stkResult.gatewayProvider,
          feeStatus: FeeStatus.Pending_STK_Push
        }
      });

      return {
        success: true,
        message: stkResult.message,
        checkoutRequestId: stkResult.checkoutRequestId,
        gatewayProvider: stkResult.gatewayProvider
      };
    } catch (err: any) {
      this.logger.error(`❌ [STK PUSH ERROR] ${err.message}`);
      if (err instanceof BadRequestException) throw err;
      const cleanMsg = cleanGatewayErrorMessage(
        err.message,
        'Failed to trigger M-Pesa STK Push. Please verify details and retry.'
      );
      throw new BadRequestException(cleanMsg);
    }
  }

  /**
   * Core Idempotent Webhook Processor for any Gateway Result
   */
  async processWebhookResult(webhookResult: WebhookResult) {
    const { checkoutRequestId, transactionRef, phoneNumber, isSuccess, status, resultCode, resultDesc, amount, mpesaReceipt, gatewayProvider } = webhookResult;

    this.logger.log(
      `📥 [WEBHOOK PROCESSING] Gateway: ${gatewayProvider} | Status: ${status} | CheckoutID: "${checkoutRequestId || 'none'}" | Ref: "${transactionRef || 'none'}"`
    );

    const cleanRef = transactionRef ? transactionRef.replace(/[^A-Za-z0-9]/g, '') : '';

    // Locate matching loan record
    let loan = await this.prisma.loanApplication.findFirst({
      where: {
        OR: [
          ...(checkoutRequestId ? [{ checkoutRequestId: checkoutRequestId }] : []),
          ...(transactionRef ? [{ transactionRef: transactionRef }] : []),
          ...(cleanRef ? [{ transactionRef: { contains: cleanRef, mode: 'insensitive' as const } }] : []),
          ...(checkoutRequestId ? [{ palplussTxId: checkoutRequestId }] : [])
        ]
      }
    });

    if (!loan && phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length >= 9) {
        loan = await this.prisma.loanApplication.findFirst({
          where: {
            phoneNumber: { contains: cleanPhone.slice(-9) },
            feeStatus: FeeStatus.Pending_STK_Push
          },
          orderBy: { createdAt: 'desc' }
        });
        if (loan) {
          this.logger.log(`🔍 [WEBHOOK MATCH] Matched loan application ${loan.transactionRef} by phone fallback (${phoneNumber}).`);
        }
      }
    }

    if (!loan) {
      this.logger.warn(`⚠️ Loan application record not found for webhook: ${checkoutRequestId || transactionRef || 'N/A'}`);
      return { success: false, error: 'Loan record not found' };
    }

    // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────────
    if (loan.feeStatus === FeeStatus.Paid) {
      this.logger.log(`⚡ [IDEMPOTENT WEBHOOK] Loan ${loan.transactionRef} is already marked as PAID. Returning HTTP 200 immediately.`);
      return {
        success: true,
        idempotent: true,
        message: 'Transaction already confirmed as Paid',
        mpesaReceipt: loan.mpesaReceipt
      };
    }

    if (isSuccess) {
      const finalReceipt = mpesaReceipt || `MP${Date.now().toString().slice(-8)}`;
      const finalAmount = loan.processingFee || amount || 450;

      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          feeStatus: FeeStatus.Paid,
          status: LoanStatus.Application_Received,
          amountPaid: finalAmount,
          mpesaReceipt: finalReceipt,
          resultCode: resultCode || '0',
          resultDesc: resultDesc || 'Success',
          gatewayProvider,
          paidAt: new Date(),
          callbackReceivedAt: new Date()
        }
      });

      this.smsService
        .sendLoanEvent({
          event: 'PAYMENT_CONFIRMED',
          applicationId: loan.id,
          userId: loan.userId || undefined,
          phone: loan.phoneNumber,
          eventVersion: 1
        })
        .catch((e) => this.logger.error(`Webhook SMS Error: ${e?.message}`));

      this.logger.log(`✅ [PAYMENT CONFIRMED] Loan ${loan.transactionRef} marked PAID via ${gatewayProvider}. Receipt: ${finalReceipt}`);

      return {
        success: true,
        message: 'Fee payment confirmed',
        transactionRef: loan.transactionRef,
        mpesaReceipt: finalReceipt,
        gatewayProvider
      };
    } else {
      let targetFeeStatus: FeeStatus = FeeStatus.Failed;
      let targetLoanStatus: LoanStatus = LoanStatus.Payment_Failed;

      if (status === 'CANCELLED') {
        targetFeeStatus = FeeStatus.Cancelled;
        targetLoanStatus = LoanStatus.Payment_Failed;
      } else if (status === 'TIMED_OUT') {
        targetFeeStatus = FeeStatus.Expired;
        targetLoanStatus = LoanStatus.Payment_Timed_Out;
      }

      await this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: {
          feeStatus: targetFeeStatus,
          status: targetLoanStatus,
          feeResultDesc: resultDesc || 'Fee payment failed',
          resultCode: resultCode || '99',
          resultDesc: resultDesc || 'Fee payment failed',
          gatewayProvider,
          callbackReceivedAt: new Date()
        }
      });

      this.smsService
        .sendLoanEvent({
          event: 'PAYMENT_FAILED',
          applicationId: loan.id,
          userId: loan.userId || undefined,
          phone: loan.phoneNumber,
          eventVersion: 1
        })
        .catch((e) => this.logger.error(`Webhook SMS Error: ${e?.message}`));

      this.logger.warn(`❌ [PAYMENT FAILED] Loan ${loan.transactionRef} marked ${targetFeeStatus} via ${gatewayProvider}. Reason: ${resultDesc}`);

      return {
        success: false,
        message: 'Fee payment failed or cancelled',
        resultCode,
        resultDesc,
        transactionRef: loan.transactionRef,
        gatewayProvider
      };
    }
  }

  /**
   * Palplus Callback handler
   */
  async handlePalplussWebhook(body: any, headers?: any, query?: any) {
    const webhookResult = await this.gatewayManager.handlePalplussWebhook(body, headers, query);
    return this.processWebhookResult(webhookResult);
  }

  /**
   * GravityPay Callback handler
   */
  async handleGravityPayWebhook(body: any, headers?: any, query?: any) {
    const webhookResult = await this.gatewayManager.handleGravityPayWebhook(body, headers, query);
    return this.processWebhookResult(webhookResult);
  }

  /**
   * Unified Callback handler (auto-detects provider)
   */
  async handleUnifiedWebhook(body: any, headers?: any, query?: any) {
    const webhookResult = await this.gatewayManager.handleUnifiedWebhook(body, headers, query);
    return this.processWebhookResult(webhookResult);
  }

  /**
   * Backward-compatible legacy webhook handler
   */
  async handleMpesaWebhook(body: any, secretProvided?: string) {
    const webhookResult = await this.gatewayManager.handleUnifiedWebhook(body, {}, { secret: secretProvided });
    return this.processWebhookResult(webhookResult);
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(txRef: string) {
    const loan = await this.prisma.loanApplication.findUnique({
      where: { transactionRef: txRef }
    });

    if (!loan) {
      throw new BadRequestException('Loan reference not found');
    }

    // If still pending STK push, query the gateway directly to check if settled
    if (loan.feeStatus === FeeStatus.Pending_STK_Push && loan.checkoutRequestId) {
      const provider = (loan.gatewayProvider as 'PALPLUSS' | 'GRAVITYPAY') || 'PALPLUSS';
      try {
        const remoteStatus = await this.gatewayManager.queryStatus(
          loan.checkoutRequestId,
          loan.transactionRef,
          provider
        );

        if (remoteStatus.status === 'SUCCESS') {
          const finalReceipt = remoteStatus.mpesaReceipt || `MP${Date.now().toString().slice(-8)}`;
          await this.prisma.loanApplication.update({
            where: { id: loan.id },
            data: {
              feeStatus: FeeStatus.Paid,
              status: LoanStatus.Application_Received,
              amountPaid: loan.processingFee || remoteStatus.amount || 450,
              mpesaReceipt: finalReceipt,
              paidAt: new Date(),
              callbackReceivedAt: new Date()
            }
          });

          return {
            success: true,
            transactionRef: loan.transactionRef,
            feeStatus: FeeStatus.Paid,
            status: LoanStatus.Application_Received,
            mpesaReceipt: finalReceipt,
            amountPaid: loan.processingFee || remoteStatus.amount || 450,
            gatewayProvider: loan.gatewayProvider
          };
        }
      } catch (e: any) {
        this.logger.debug(`Background gateway status check failed: ${e.message}`);
      }
    }

    return {
      success: true,
      transactionRef: loan.transactionRef,
      feeStatus: loan.feeStatus,
      status: loan.status,
      mpesaReceipt: loan.mpesaReceipt,
      amountPaid: loan.amountPaid,
      gatewayProvider: loan.gatewayProvider || 'PALPLUSS'
    };
  }

  /**
   * Gateway Settings Operations
   */
  async getGatewayConfig() {
    const config = await this.gatewayManager.getResolvedConfig();
    const baseUrl = config.callbackBackendBaseUrl || 'https://jijenge-loans-backend.onrender.com';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    return {
      success: true,
      activeGateway: config.activeGateway,
      callbackBackendBaseUrl: cleanBaseUrl,
      palpluss: {
        apiKey: config.palpluss.apiKey ? '••••••••' + config.palpluss.apiKey.slice(-6) : '',
        rawApiKey: config.palpluss.apiKey || '',
        channelId: config.palpluss.channelId || '1',
        webhookSecret: config.palpluss.webhookSecret || '',
        callbackUrl: `${cleanBaseUrl}/api/payments/callback/palpluss`
      },
      gravityPay: {
        publicKey: config.gravityPay.publicKey || '',
        secretKey: config.gravityPay.secretKey ? '••••••••' + config.gravityPay.secretKey.slice(-6) : '',
        rawSecretKey: config.gravityPay.secretKey || '',
        webhookSecret: config.gravityPay.webhookSecret || '',
        channelId: config.gravityPay.channelId || '',
        callbackUrl: `${cleanBaseUrl}/api/payments/callback/gravitypay`
      },
      unifiedCallbackUrl: `${cleanBaseUrl}/api/payments/callback`
    };
  }

  async updateGatewayConfig(data: any) {
    const updated = await this.gatewayManager.updateConfig(data);
    this.logger.log(`⚙️ [PAYMENT GATEWAY CONFIG UPDATED] Active Gateway: ${updated.activeGateway}`);
    return this.getGatewayConfig();
  }

  async switchGateway(gateway: 'PALPLUSS' | 'GRAVITYPAY') {
    await this.gatewayManager.switchGateway(gateway);
    return this.getGatewayConfig();
  }
}
