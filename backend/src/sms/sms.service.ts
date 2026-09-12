import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '@prisma/client';

export const DEFAULT_SMS_TEMPLATES = [
  {
    key: 'APPLICATION_RECEIVED',
    title: 'Application Received & Fee Prompt',
    body: 'Dear {fullName}, your loan application for {packageName} (KSh {amount}) was received (Ref: {txRef}). Complete processing fee payment of KSh {processingFee} to proceed.',
    variables: ['fullName', 'packageName', 'amount', 'txRef', 'processingFee']
  },
  {
    key: 'INITIAL_VERIFICATION',
    title: 'Initial Verification Underway',
    body: 'Dear {fullName}, your loan application {txRef} is currently undergoing initial document and identity verification.',
    variables: ['fullName', 'txRef']
  },
  {
    key: 'CREDIT_ASSESSMENT',
    title: 'Credit Risk Assessment',
    body: 'Dear {fullName}, credit risk assessment for your application {txRef} ({packageName}, KSh {amount}) is now underway.',
    variables: ['fullName', 'txRef', 'packageName', 'amount']
  },
  {
    key: 'LOAN_REVIEW',
    title: 'Loan Final Review',
    body: 'Dear {fullName}, application {txRef} is under final review by our Jijenge underwriting team.',
    variables: ['fullName', 'txRef']
  },
  {
    key: 'APPROVED',
    title: 'Loan Approved',
    body: 'Dear {fullName}, congratulations! Your Jijenge Loan application {txRef} for KSh {amount} has been APPROVED.',
    variables: ['fullName', 'txRef', 'amount']
  },
  {
    key: 'DISBURSEMENT_IN_PROGRESS',
    title: 'Disbursement In Progress',
    body: 'Dear {fullName}, disbursement of KSh {amount} for loan {txRef} is processing to your M-Pesa account.',
    variables: ['fullName', 'txRef', 'amount']
  },
  {
    key: 'DISBURSED',
    title: 'Loan Disbursed',
    body: 'Dear {fullName}, KSh {amount} for loan {txRef} has been disbursed to your M-Pesa. Installment: KSh {installmentAmount} ({repaymentFrequency}).',
    variables: ['fullName', 'txRef', 'amount', 'installmentAmount', 'repaymentFrequency']
  },
  {
    key: 'REJECTED',
    title: 'Application Declined',
    body: 'Dear {fullName}, we regret to inform you that loan application {txRef} could not be approved at this time.',
    variables: ['fullName', 'txRef']
  },
  {
    key: 'COMPLETED',
    title: 'Loan Repaid & Completed',
    body: 'Dear {fullName}, your Jijenge Loan {txRef} has been fully repaid and completed. Thank you for choosing Jijenge Loans!',
    variables: ['fullName', 'txRef']
  },
  {
    key: 'CANCELLED',
    title: 'Application Cancelled',
    body: 'Dear {fullName}, loan application {txRef} has been cancelled.',
    variables: ['fullName', 'txRef']
  },
  {
    key: 'FEE_PAYMENT_SUCCESS',
    title: 'Processing Fee Payment Received',
    body: 'Dear {fullName}, processing fee payment of KSh {processingFee} for loan {txRef} was received successfully. Your loan is now processing.',
    variables: ['fullName', 'txRef', 'processingFee']
  },
  {
    key: 'REMINDER_24H',
    title: '24-Hour Action & Payment Reminder',
    body: 'Dear {fullName}, 24-hour reminder: your Jijenge Loan application (Ref: {txRef}, KSh {amount}) requires processing fee payment within 24 hours to proceed.',
    variables: ['fullName', 'txRef', 'amount']
  },
  {
    key: 'REMINDER_7D',
    title: '7-Day Repayment Notice',
    body: 'Dear {fullName}, 7-day notice: your Jijenge Loan repayment of KSh {amount} (Ref: {txRef}) is due soon.',
    variables: ['fullName', 'txRef', 'amount']
  },
  {
    key: 'BALANCE_ALLOCATED',
    title: 'Loan Balance Allocated',
    body: 'Dear {fullName}, your loan balance of KSh {amount} (Ref: {txRef}) has been allocated to your Jijenge account! Log into your portal to withdraw.',
    variables: ['fullName', 'amount', 'txRef']
  },
  {
    key: 'WITHDRAWAL_REQUESTED',
    title: 'Withdrawal Request Received',
    body: 'Dear {fullName}, your withdrawal request of KSh {amount} (Ref: {txRef}) has been submitted. Pay withdrawal fee of KSh {processingFee} to process.',
    variables: ['fullName', 'amount', 'txRef', 'processingFee']
  },
  {
    key: 'WITHDRAWAL_FEE_PAID',
    title: 'Withdrawal Fee Payment Received',
    body: 'Dear {fullName}, withdrawal processing fee payment of KSh {processingFee} for loan {txRef} is received! Your withdrawal request of KSh {amount} is now being processed to your M-Pesa.',
    variables: ['fullName', 'processingFee', 'txRef', 'amount']
  },
  {
    key: 'WITHDRAWAL_APPROVED',
    title: 'Withdrawal Approved & Disbursed',
    body: 'Dear {fullName}, KSh {amount} for loan {txRef} has been successfully sent to your M-Pesa phone number. Thank you for choosing Jijenge Loans!',
    variables: ['fullName', 'amount', 'txRef']
  },
  {
    key: 'WITHDRAWAL_REJECTED',
    title: 'Withdrawal Declined & Balance Restored',
    body: 'Dear {fullName}, your withdrawal request of KSh {amount} (Ref: {txRef}) was declined due to: {rejectionReason}. KSh {amount} has been returned to your portal balance. Please log in to update your profile details and re-request withdrawal.',
    variables: ['fullName', 'amount', 'txRef', 'rejectionReason']
  }
];

const STATUS_TEMPLATE_MAP: Record<string, string> = {
  Pending: 'APPLICATION_RECEIVED',
  Pending_STK_Fee_Payment: 'APPLICATION_RECEIVED',
  Application_Received: 'APPLICATION_RECEIVED',
  Initial_Verification: 'INITIAL_VERIFICATION',
  Document_Verification: 'INITIAL_VERIFICATION',
  Credit_Assessment: 'CREDIT_ASSESSMENT',
  Risk_Assessment: 'CREDIT_ASSESSMENT',
  Loan_Review: 'LOAN_REVIEW',
  Under_Review: 'LOAN_REVIEW',
  Processing: 'LOAN_REVIEW',
  Approved: 'APPROVED',
  Awaiting_Disbursement: 'DISBURSEMENT_IN_PROGRESS',
  Disbursement_In_Progress: 'DISBURSEMENT_IN_PROGRESS',
  Disbursed: 'DISBURSED',
  Loan_Completed: 'COMPLETED',
  Rejected: 'REJECTED',
  Payment_Failed: 'CANCELLED',
  Payment_Timed_Out: 'CANCELLED'
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Anti-Spam Check: prevents duplicate SMS within 3 mins & caps at 10 SMS/day per phone */
  async isSpam(recipientPhone: string, message: string): Promise<{ spam: boolean; reason?: string }> {
    try {
      const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
      const recentDup = await this.prisma.smsLog.findFirst({
        where: {
          recipientPhone,
          message,
          createdAt: { gte: threeMinsAgo }
        }
      });
      if (recentDup) {
        return { spam: true, reason: 'Duplicate SMS blocked within 3-minute cooldown period' };
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyCount = await this.prisma.smsLog.count({
        where: {
          recipientPhone,
          createdAt: { gte: twentyFourHoursAgo }
        }
      });
      if (dailyCount >= 10) {
        return { spam: true, reason: 'Daily SMS limit of 10 messages exceeded for recipient' };
      }

      return { spam: false };
    } catch {
      return { spam: false };
    }
  }

  async sendSms(
    recipientPhone: string,
    message: string,
    ignoreSpamFilter: boolean = false
  ): Promise<{ success: boolean; gatewayId?: string; simulated?: boolean; error?: string }> {
    if (!recipientPhone || !message) {
      return { success: false, error: 'Missing phone number or message text' };
    }

    let formattedPhone = String(recipientPhone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('254')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Check anti-spam protection unless explicitly bypassed
    if (!ignoreSpamFilter) {
      const spamCheck = await this.isSpam(formattedPhone, message);
      if (spamCheck.spam) {
        const errorDesc = `[ANTI-SPAM SUPPRESSED] ${spamCheck.reason}`;
        this.logger.warn(`🛡️ ${errorDesc} | Recipient: ${formattedPhone}`);
        await this.prisma.smsLog.create({
          data: {
            recipientPhone: formattedPhone,
            message,
            success: false,
            simulated: true,
            error: errorDesc
          }
        });
        return { success: false, simulated: true, error: errorDesc };
      }
    }

    const username = process.env.SMSGATEWAY_USERNAME;
    const password = process.env.SMSGATEWAY_PASSWORD;
    const baseUrl = process.env.SMSGATEWAY_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1';
    const simNumber = parseInt(process.env.SMSGATEWAY_SIM_NUMBER || '1', 10);

    if (!username || !password) {
      this.logger.log(`📱 [SMS SIMULATION] To: ${formattedPhone} | Text: "${message}"`);
      await this.prisma.smsLog.create({
        data: {
          recipientPhone: formattedPhone,
          message,
          simulated: true,
          success: true
        }
      });
      return { success: true, simulated: true };
    }

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/messages`;
      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        body: JSON.stringify({
          message,
          phoneNumbers: [formattedPhone],
          simNumber
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`❌ [SMS GATEWAY ERROR] ${response.status}: ${errText}`);
        await this.prisma.smsLog.create({
          data: { recipientPhone: formattedPhone, message, success: false, error: errText }
        });
        return { success: false, error: errText };
      }

      const data = (await response.json()) as { id?: string };
      this.logger.log(`✅ [SMS SENT] Recipient: ${formattedPhone} | Gateway ID: ${data.id || 'N/A'}`);

      await this.prisma.smsLog.create({
        data: { recipientPhone: formattedPhone, message, gatewayId: data.id || null, success: true }
      });

      return { success: true, gatewayId: data.id };
    } catch (err: any) {
      this.logger.error(`❌ [SMS EXCEPTION] ${err.message}`);
      await this.prisma.smsLog.create({
        data: { recipientPhone: formattedPhone, message, success: false, error: err.message }
      });
      return { success: false, error: err.message };
    }
  }

  async sendTemplateSms(
    templateKey: string,
    recipientPhone: string,
    variables: Record<string, string | number> = {}
  ): Promise<{ success: boolean; gatewayId?: string; simulated?: boolean; error?: string }> {
    try {
      let tpl = await this.prisma.smsTemplate.findUnique({ where: { key: templateKey } });
      if (!tpl) {
        const defaultDef = DEFAULT_SMS_TEMPLATES.find(t => t.key === templateKey);
        if (defaultDef) {
          tpl = await this.prisma.smsTemplate.create({ data: defaultDef });
        }
      }

      if (!tpl) {
        return this.sendSms(recipientPhone, `Notification from Jijenge Loans: ${JSON.stringify(variables)}`);
      }

      let messageText = tpl.body;
      for (const [k, v] of Object.entries(variables)) {
        messageText = messageText.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }

      return this.sendSms(recipientPhone, messageText);
    } catch (err: any) {
      this.logger.error(`Failed to send template SMS (${templateKey}): ${err?.message}`);
      return { success: false, error: err?.message };
    }
  }

  async triggerStatusSms(loan: any, status: LoanStatus | string) {
    if (!loan || !loan.phoneNumber) return;
    const templateKey = STATUS_TEMPLATE_MAP[status];
    if (!templateKey) return;

    const amountStr = Number(loan.amount || 0).toLocaleString();
    const feeStr = Number(loan.processingFee || loan.fee || 450).toLocaleString();
    const instStr = Number(loan.installmentAmount || Math.round((loan.amount * 1.05) / 4)).toLocaleString();
    const freqStr = loan.repaymentFrequency || 'Weekly';

    return this.sendTemplateSms(templateKey, loan.phoneNumber, {
      fullName: loan.fullName || 'Valued Customer',
      packageName: loan.packageName || 'Jijenge Loan',
      amount: amountStr,
      txRef: loan.transactionRef || '',
      processingFee: feeStr,
      installmentAmount: instStr,
      repaymentFrequency: freqStr
    });
  }

  async triggerReminders(): Promise<{ success: boolean; processed24hCount: number; processed7dCount: number }> {
    let processed24hCount = 0;
    let processed7dCount = 0;

    try {
      // 1. 24-Hour Fee Payment / Application Action Reminders
      const twentyFourHoursAgoMin = new Date(Date.now() - 28 * 60 * 60 * 1000);
      const twentyFourHoursAgoMax = new Date(Date.now() - 20 * 60 * 60 * 1000);

      const pending24hLoans = await this.prisma.loanApplication.findMany({
        where: {
          createdAt: { gte: twentyFourHoursAgoMin, lte: twentyFourHoursAgoMax },
          feeStatus: { notIn: ['Paid'] },
          status: { in: [LoanStatus.Pending, LoanStatus.Pending_STK_Fee_Payment, LoanStatus.Application_Received] }
        }
      });

      for (const loan of pending24hLoans) {
        const res = await this.sendTemplateSms('REMINDER_24H', loan.phoneNumber, {
          fullName: loan.fullName || 'Valued Customer',
          txRef: loan.transactionRef,
          amount: Number(loan.amount || 0).toLocaleString()
        });
        if (res.success || res.simulated) processed24hCount++;
      }

      // 2. 7-Day Repayment Reminders
      const sevenDaysAgoMin = new Date(Date.now() - (7 * 24 + 12) * 60 * 60 * 1000);
      const sevenDaysAgoMax = new Date(Date.now() - (7 * 24 - 12) * 60 * 60 * 1000);

      const active7dLoans = await this.prisma.loanApplication.findMany({
        where: {
          updatedAt: { gte: sevenDaysAgoMin, lte: sevenDaysAgoMax },
          status: { in: [LoanStatus.Disbursed, LoanStatus.Approved] }
        }
      });

      for (const loan of active7dLoans) {
        const res = await this.sendTemplateSms('REMINDER_7D', loan.phoneNumber, {
          fullName: loan.fullName || 'Valued Customer',
          txRef: loan.transactionRef,
          amount: Number(loan.installmentAmount || loan.amount || 0).toLocaleString()
        });
        if (res.success || res.simulated) processed7dCount++;
      }

      return { success: true, processed24hCount, processed7dCount };
    } catch (err: any) {
      this.logger.error(`Failed to trigger reminders: ${err?.message}`);
      return { success: false, processed24hCount, processed7dCount };
    }
  }

  async getSmsTemplates() {
    try {
      let items = await this.prisma.smsTemplate.findMany({ orderBy: { key: 'asc' } });
      if (!items || items.length === 0) {
        for (const seed of DEFAULT_SMS_TEMPLATES) {
          try {
            await this.prisma.smsTemplate.create({ data: seed });
          } catch { /* ignored fallback */ }
        }
        items = await this.prisma.smsTemplate.findMany({ orderBy: { key: 'asc' } });
      }
      return { success: true, items };
    } catch (err: any) {
      this.logger.error(`Failed to fetch SMS templates: ${err?.message}`);
      return { success: true, items: DEFAULT_SMS_TEMPLATES };
    }
  }

  async seedDefaultSmsTemplates() {
    for (const seed of DEFAULT_SMS_TEMPLATES) {
      try {
        await this.prisma.smsTemplate.upsert({
          where: { key: seed.key },
          create: seed,
          update: { title: seed.title }
        });
      } catch { /* ignored */ }
    }
    return this.getSmsTemplates();
  }

  async upsertSmsTemplate(body: { key: string; title: string; body: string; variables?: string[] }) {
    const key = String(body.key || '').trim().toUpperCase();
    if (!key) throw new Error('Template key is required');

    const template = await this.prisma.smsTemplate.upsert({
      where: { key },
      create: {
        key,
        title: body.title || key,
        body: body.body || '',
        variables: body.variables || []
      },
      update: {
        title: body.title,
        body: body.body,
        variables: body.variables || []
      }
    });

    return { success: true, template };
  }
}
