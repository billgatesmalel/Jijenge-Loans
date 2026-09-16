import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '@prisma/client';
import { getPublicUrls, PublicUrlsConfig } from './notification-urls.config';

export interface SmsTemplateDef {
  key: string;
  title: string;
  category: 'APPLICATION' | 'PAYMENT' | 'APPROVAL' | 'FUNDS' | 'WITHDRAWAL' | 'REMINDERS' | 'SYSTEM' | 'SUPPORT';
  description: string;
  body: string;
  variables: string[];
  supportedPlaceholders: string[];
  notes?: string;
}

export const SYSTEM_PLACEHOLDERS = [
  'firstName',
  'phoneNumber',
  'loanReference',
  'loanAmount',
  'allocatedAmount',
  'withdrawalFee',
  'repaymentAmount',
  'repaymentDate',
  'status',
  'supportNumber',
  'businessName',
  'applyLink',
  'trackLink',
  'portalLink',
  'supportLink',
  'rejectionReason'
];

export const DEFAULT_SMS_TEMPLATES: SmsTemplateDef[] = [
  {
    key: 'APPLICATION_SUBMITTED',
    title: 'Application Submitted',
    category: 'APPLICATION',
    description: 'Triggered when a customer registers and submits a new loan application.',
    body: 'Hi {firstName}, we’ve received your Jijenge Loans application {loanReference}. Our team is processing your application and we’ll update you once there is progress. Track your application: {trackLink} {businessName}',
    variables: ['firstName', 'loanReference', 'trackLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'trackLink', 'businessName', 'loanAmount']
  },
  {
    key: 'APPLICATION_UNDER_REVIEW',
    title: 'Application Under Review',
    category: 'APPLICATION',
    description: 'Triggered when an application advances to document or credit verification.',
    body: 'Hi {firstName}, your Jijenge Loans application {loanReference} is currently under review. We’ll notify you once the assessment is complete. You can check your status here: {trackLink} {businessName}',
    variables: ['firstName', 'loanReference', 'trackLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'trackLink', 'businessName', 'status']
  },
  {
    key: 'APPLICATION_APPROVED',
    title: 'Application Approved',
    category: 'APPROVAL',
    description: 'Triggered when a loan application is approved by credit assessment.',
    body: 'Hi {firstName}, your Jijenge Loans application {loanReference} has been approved for KES {allocatedAmount}. Please log in to your customer portal to review the details and continue: {portalLink} {businessName}',
    variables: ['firstName', 'loanReference', 'allocatedAmount', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'allocatedAmount', 'portalLink', 'businessName', 'repaymentAmount']
  },
  {
    key: 'PAYMENT_REQUIRED',
    title: 'Processing Payment Required',
    category: 'PAYMENT',
    description: 'Triggered when an application requires processing fee payment to proceed.',
    body: 'Hi {firstName}, your Jijenge Loans application {loanReference} requires the applicable processing payment before the next stage. Please review and continue securely through your portal: {portalLink} {businessName}',
    variables: ['firstName', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'portalLink', 'businessName', 'withdrawalFee']
  },
  {
    key: 'PAYMENT_PENDING',
    title: 'Payment Confirmation Pending',
    category: 'PAYMENT',
    description: 'Triggered when M-Pesa STK push is dispatched and waiting for PIN confirmation.',
    body: 'Hi {firstName}, we’re waiting for confirmation of the payment for application {loanReference}. Please allow some time for processing. Check your application here: {trackLink} {businessName}',
    variables: ['firstName', 'loanReference', 'trackLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'trackLink', 'businessName']
  },
  {
    key: 'PAYMENT_CONFIRMED',
    title: 'Payment Received & Confirmed',
    category: 'PAYMENT',
    description: 'Triggered after M-Pesa confirms successful processing fee receipt.',
    body: 'Hi {firstName}, your payment for Jijenge Loans application {loanReference} has been received. Your application will now proceed to the next stage. Track it here: {trackLink} {businessName}',
    variables: ['firstName', 'loanReference', 'trackLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'trackLink', 'businessName']
  },
  {
    key: 'PAYMENT_FAILED',
    title: 'Payment Confirmation Failed',
    category: 'PAYMENT',
    description: 'Triggered when payment is cancelled or rejected by user/M-Pesa.',
    body: 'Hi {firstName}, we could not confirm the payment for application {loanReference}. Please check your customer portal for the current status and available next steps: {portalLink} {businessName}',
    variables: ['firstName', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'portalLink', 'businessName']
  },
  {
    key: 'PAYMENT_TIMED_OUT',
    title: 'Payment Request Timed Out',
    category: 'PAYMENT',
    description: 'Triggered when STK push times out without PIN entry response.',
    body: 'Hi {firstName}, we have not yet received confirmation of the payment for application {loanReference}. If you were charged, please allow time for confirmation before trying again. Check your status: {trackLink} {businessName}',
    variables: ['firstName', 'loanReference', 'trackLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'trackLink', 'businessName']
  },
  {
    key: 'FUNDS_ALLOCATED',
    title: 'Approved Loan Balance Allocated',
    category: 'FUNDS',
    description: 'Triggered when administrator allocates approved loan funds to customer portal.',
    body: 'Hi {firstName}, KES {allocatedAmount} has been allocated to your Jijenge Loans application {loanReference}. Please log in to your customer portal to review the details and complete the next step: {portalLink} {businessName}',
    variables: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName']
  },
  {
    key: 'WITHDRAWAL_PENDING',
    title: 'Withdrawal Request Received',
    category: 'WITHDRAWAL',
    description: 'Triggered when customer submits withdrawal request in portal.',
    body: 'Hi {firstName}, your withdrawal request for KES {allocatedAmount} is being processed. We’ll notify you once the transaction is completed. Check your status: {portalLink} {businessName}',
    variables: ['firstName', 'allocatedAmount', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'allocatedAmount', 'withdrawalFee', 'portalLink', 'businessName']
  },
  {
    key: 'WITHDRAWAL_COMPLETED',
    title: 'Withdrawal Disbursed Successfully',
    category: 'WITHDRAWAL',
    description: 'Triggered when admin approves disbursement or gateway confirms payout.',
    body: 'Hi {firstName}, your Jijenge Loans withdrawal of KES {allocatedAmount} for application {loanReference} has been completed. Please check your M-Pesa account and portal for the transaction details: {portalLink} {businessName}',
    variables: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName']
  },
  {
    key: 'WITHDRAWAL_FAILED',
    title: 'Withdrawal Processing Error',
    category: 'WITHDRAWAL',
    description: 'Triggered if withdrawal payout encounters a technical error.',
    body: 'Hi {firstName}, we could not complete your withdrawal request for application {loanReference}. Please log in to your customer portal to review the status and available next steps: {portalLink} {businessName}',
    variables: ['firstName', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'portalLink', 'businessName']
  },
  {
    key: 'WITHDRAWAL_REJECTED',
    title: 'Withdrawal Declined & Restored',
    category: 'WITHDRAWAL',
    description: 'Triggered when admin declines withdrawal request and reverts funds to balance.',
    body: 'Hi {firstName}, your withdrawal request of KES {allocatedAmount} for application {loanReference} was not completed. Your available balance has been updated where applicable. Please review your portal: {portalLink} {businessName}',
    variables: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'allocatedAmount', 'loanReference', 'rejectionReason', 'portalLink', 'businessName']
  },
  {
    key: 'APPLICATION_REJECTED',
    title: 'Application Declined',
    category: 'APPROVAL',
    description: 'Triggered when application does not meet eligibility criteria.',
    body: 'Hi {firstName}, your Jijenge Loans application {loanReference} was not approved at this time. You can review your application status and available information here: {trackLink} {businessName}',
    variables: ['firstName', 'loanReference', 'trackLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'trackLink', 'businessName']
  },
  {
    key: 'APPLICATION_SYSTEM_ERROR',
    title: 'System Error / Re-Application',
    category: 'SYSTEM',
    description: 'Triggered when customer is invited to restart after a system resolution.',
    body: 'Hi {firstName}, we’re sorry for the inconvenience with your previous Jijenge Loans application. A system issue affecting the application process has been resolved. You can now apply again here: {applyLink} {businessName}',
    variables: ['firstName', 'applyLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'applyLink', 'businessName', 'loanReference']
  },
  {
    key: 'APPLICATION_REMINDER',
    title: 'Incomplete Action / Payment Reminder',
    category: 'REMINDERS',
    description: '24-hour reminder dispatched to users with pending applications.',
    body: 'Hi {firstName}, your Jijenge Loans application {loanReference} requires processing before the next stage. Please log in to your customer portal to review and continue: {portalLink} {businessName}',
    variables: ['firstName', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'loanReference', 'portalLink', 'businessName']
  },
  {
    key: 'WITHDRAWAL_REMINDER',
    title: 'Allocated Funds Awaiting Withdrawal',
    category: 'REMINDERS',
    description: 'Reminder sent when approved funds remain unwithdrawn in portal.',
    body: 'Hi {firstName}, your approved funds of KES {allocatedAmount} for application {loanReference} are still available for withdrawal. Please log in to your customer portal to review and continue: {portalLink} {businessName}',
    variables: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'allocatedAmount', 'loanReference', 'portalLink', 'businessName']
  },
  {
    key: 'SUPPORT_REQUEST_RECEIVED',
    title: 'Support Agent Reply',
    category: 'SUPPORT',
    description: 'Triggered when support replies to a customer ticket or message.',
    body: 'Hi {firstName}, Jijenge Support replied to your inquiry: "{status}". Click to view & reply directly in support: {supportLink} {businessName}',
    variables: ['firstName', 'status', 'supportLink', 'businessName'],
    supportedPlaceholders: ['firstName', 'status', 'supportLink', 'businessName']
  }
];

const STATUS_TO_EVENT_KEY: Record<string, string> = {
  Pending: 'APPLICATION_SUBMITTED',
  PENDING: 'APPLICATION_SUBMITTED',
  Pending_STK_Fee_Payment: 'PAYMENT_REQUIRED',
  'Pending STK Fee Payment': 'PAYMENT_REQUIRED',
  Application_Received: 'APPLICATION_SUBMITTED',
  'Application Received': 'APPLICATION_SUBMITTED',
  Initial_Verification: 'APPLICATION_UNDER_REVIEW',
  'Initial Verification': 'APPLICATION_UNDER_REVIEW',
  Document_Verification: 'APPLICATION_UNDER_REVIEW',
  'Document Verification': 'APPLICATION_UNDER_REVIEW',
  Credit_Assessment: 'APPLICATION_UNDER_REVIEW',
  'Credit Assessment': 'APPLICATION_UNDER_REVIEW',
  Risk_Assessment: 'APPLICATION_UNDER_REVIEW',
  'Risk Assessment': 'APPLICATION_UNDER_REVIEW',
  Loan_Review: 'APPLICATION_UNDER_REVIEW',
  'Loan Review': 'APPLICATION_UNDER_REVIEW',
  Under_Review: 'APPLICATION_UNDER_REVIEW',
  'Under Review': 'APPLICATION_UNDER_REVIEW',
  Processing: 'APPLICATION_UNDER_REVIEW',
  Approved: 'APPLICATION_APPROVED',
  APPROVED: 'APPLICATION_APPROVED',
  Awaiting_Disbursement: 'WITHDRAWAL_PENDING',
  'Awaiting Disbursement': 'WITHDRAWAL_PENDING',
  Disbursement_In_Progress: 'WITHDRAWAL_PENDING',
  'Disbursement In Progress': 'WITHDRAWAL_PENDING',
  Disbursed: 'WITHDRAWAL_COMPLETED',
  DISBURSED: 'WITHDRAWAL_COMPLETED',
  Loan_Completed: 'WITHDRAWAL_COMPLETED',
  'Loan Completed': 'WITHDRAWAL_COMPLETED',
  Rejected: 'APPLICATION_REJECTED',
  REJECTED: 'APPLICATION_REJECTED',
  Payment_Failed: 'PAYMENT_FAILED',
  'Payment Failed': 'PAYMENT_FAILED',
  Payment_Timed_Out: 'PAYMENT_TIMED_OUT',
  'Payment Timed Out': 'PAYMENT_TIMED_OUT'
};

export function calculateSmsSegments(text: string): { charCount: number; isUnicode: boolean; segmentCount: number } {
  if (!text) return { charCount: 0, isUnicode: false, segmentCount: 0 };
  
  // Standard GSM 7-bit character set check
  const gsm7Regex = /^[\n\r a-zA-Z0-9^{}\\\[~\]\|€!#\$%&'\(\)\*\+,\-\.\/:;<=>\?@_]*$/;
  const isUnicode = !gsm7Regex.test(text);
  const charCount = text.length;

  let segmentCount = 1;
  if (isUnicode) {
    if (charCount > 70) {
      segmentCount = Math.ceil(charCount / 67);
    }
  } else {
    if (charCount > 160) {
      segmentCount = Math.ceil(charCount / 153);
    }
  }

  return { charCount, isUnicode, segmentCount };
}

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

  /** Retrieve SMS Gateway details from DB SystemSetting with fallback to process.env */
  async getGatewayConfig(): Promise<{
    username: string;
    password: string;
    baseUrl: string;
    simNumber: string;
    enabled: boolean;
  }> {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'SMSGATEWAY_USERNAME',
              'SMSGATEWAY_PASSWORD',
              'SMSGATEWAY_BASE_URL',
              'SMSGATEWAY_SIM_NUMBER',
              'SMSGATEWAY_ENABLED'
            ]
          }
        }
      });

      const map = new Map(settings.map(s => [s.key, s.value]));

      const username = map.get('SMSGATEWAY_USERNAME') ?? process.env.SMSGATEWAY_USERNAME ?? '';
      const password = map.get('SMSGATEWAY_PASSWORD') ?? process.env.SMSGATEWAY_PASSWORD ?? '';
      const baseUrl = map.get('SMSGATEWAY_BASE_URL') ?? process.env.SMSGATEWAY_BASE_URL ?? 'https://api.sms-gate.app/3rdparty/v1';
      const simNumber = map.get('SMSGATEWAY_SIM_NUMBER') ?? process.env.SMSGATEWAY_SIM_NUMBER ?? '1';
      const enabled = map.has('SMSGATEWAY_ENABLED') ? map.get('SMSGATEWAY_ENABLED') === 'true' : true;

      return { username, password, baseUrl, simNumber, enabled };
    } catch (err: any) {
      this.logger.error(`Error fetching SMS gateway config: ${err?.message}`);
      return {
        username: process.env.SMSGATEWAY_USERNAME || '',
        password: process.env.SMSGATEWAY_PASSWORD || '',
        baseUrl: process.env.SMSGATEWAY_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1',
        simNumber: process.env.SMSGATEWAY_SIM_NUMBER || '1',
        enabled: true
      };
    }
  }

  /** Upsert SMS Gateway credentials into SystemSetting table */
  async saveGatewayConfig(dto: {
    username?: string;
    password?: string;
    baseUrl?: string;
    simNumber?: string;
    enabled?: boolean;
  }): Promise<{ success: boolean; config: any }> {
    const entries: Array<{ key: string; value: string }> = [];

    if (dto.username !== undefined) entries.push({ key: 'SMSGATEWAY_USERNAME', value: String(dto.username).trim() });
    if (dto.password !== undefined) entries.push({ key: 'SMSGATEWAY_PASSWORD', value: String(dto.password).trim() });
    if (dto.baseUrl !== undefined) entries.push({ key: 'SMSGATEWAY_BASE_URL', value: String(dto.baseUrl).trim() });
    if (dto.simNumber !== undefined) entries.push({ key: 'SMSGATEWAY_SIM_NUMBER', value: String(dto.simNumber).trim() });
    if (dto.enabled !== undefined) entries.push({ key: 'SMSGATEWAY_ENABLED', value: dto.enabled ? 'true' : 'false' });

    for (const entry of entries) {
      await this.prisma.systemSetting.upsert({
        where: { key: entry.key },
        create: entry,
        update: { value: entry.value }
      });
    }

    const updatedConfig = await this.getGatewayConfig();
    return { success: true, config: updatedConfig };
  }

  /** Run diagnostic test dispatch to verify SMS Gateway connectivity */
  async testSmsGateway(recipientPhone: string): Promise<{ success: boolean; gatewayId?: string; simulated?: boolean; error?: string }> {
    if (!recipientPhone) {
      return { success: false, error: 'Recipient phone number is required for gateway test' };
    }
    const testMessage = `[Jijenge Loans Test] Gateway connectivity check at ${new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })}. SMS service is operational.`;
    return this.sendSms(recipientPhone, testMessage, true);
  }

  /** Format raw phone number into standard international format (+254...) */
  formatPhoneNumber(phone: string): string {
    let clean = String(phone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) {
      return '+254' + clean.slice(1);
    } else if (clean.startsWith('254')) {
      return '+' + clean;
    } else if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
      return '+254' + clean;
    } else if (!clean.startsWith('+') && clean.length > 0) {
      return '+' + clean;
    }
    return phone;
  }

  /** Dispatch raw SMS message through gateway or simulation */
  async sendSms(
    recipientPhone: string,
    message: string,
    ignoreSpamFilter: boolean = false,
    metadata: {
      loanApplicationId?: string;
      userId?: string;
      eventKey?: string;
      templateId?: string;
      linkUsed?: string;
      idempotencyKey?: string;
    } = {}
  ): Promise<{ success: boolean; gatewayId?: string; simulated?: boolean; error?: string; status?: string }> {
    if (!recipientPhone || !message) {
      return { success: false, error: 'Missing phone number or message text' };
    }

    const formattedPhone = this.formatPhoneNumber(recipientPhone);

    // Check Idempotency Key
    if (metadata.idempotencyKey) {
      try {
        const existing = await this.prisma.smsLog.findUnique({
          where: { idempotencyKey: metadata.idempotencyKey }
        });
        if (existing && (existing.success || existing.status === 'DUPLICATE_SUPPRESSED' || existing.status === 'SENT')) {
          this.logger.log(`🛡️ [IDEMPOTENCY SUPPRESSED] Duplicate event "${metadata.idempotencyKey}" blocked.`);
          return { success: true, simulated: true, status: 'DUPLICATE_SUPPRESSED' };
        }
      } catch { /* ignored */ }
    }

    // Check anti-spam protection unless explicitly bypassed
    if (!ignoreSpamFilter) {
      const spamCheck = await this.isSpam(formattedPhone, message);
      if (spamCheck.spam) {
        const errorDesc = `[ANTI-SPAM SUPPRESSED] ${spamCheck.reason}`;
        this.logger.warn(`🛡️ ${errorDesc} | Recipient: ${formattedPhone}`);
        await this.prisma.smsLog.create({
          data: {
            loanApplicationId: metadata.loanApplicationId || null,
            userId: metadata.userId || null,
            eventKey: metadata.eventKey || null,
            templateId: metadata.templateId || null,
            recipientPhone: formattedPhone,
            message,
            linkUsed: metadata.linkUsed || null,
            status: 'DUPLICATE_SUPPRESSED',
            success: false,
            simulated: true,
            error: errorDesc,
            idempotencyKey: metadata.idempotencyKey || null
          }
        });
        return { success: false, simulated: true, error: errorDesc, status: 'DUPLICATE_SUPPRESSED' };
      }
    }

    const config = await this.getGatewayConfig();

    if (config.enabled === false) {
      const disabledMsg = '[SMS GATEWAY DISABLED] Gateway dispatch is disabled in admin settings';
      this.logger.log(`📱 ${disabledMsg} | To: ${formattedPhone}`);
      await this.prisma.smsLog.create({
        data: {
          loanApplicationId: metadata.loanApplicationId || null,
          userId: metadata.userId || null,
          eventKey: metadata.eventKey || null,
          templateId: metadata.templateId || null,
          recipientPhone: formattedPhone,
          message,
          linkUsed: metadata.linkUsed || null,
          status: 'FAILED',
          simulated: true,
          success: false,
          error: disabledMsg,
          idempotencyKey: metadata.idempotencyKey || null
        }
      });
      return { success: false, simulated: true, error: disabledMsg, status: 'FAILED' };
    }

    const username = config.username;
    const password = config.password;
    const baseUrl = config.baseUrl || 'https://api.sms-gate.app/3rdparty/v1';
    const simNumber = parseInt(config.simNumber || '1', 10);

    if (!username || !password) {
      this.logger.log(`📱 [SMS SIMULATION] To: ${formattedPhone} | Text: "${message}"`);
      await this.prisma.smsLog.create({
        data: {
          loanApplicationId: metadata.loanApplicationId || null,
          userId: metadata.userId || null,
          eventKey: metadata.eventKey || null,
          templateId: metadata.templateId || null,
          recipientPhone: formattedPhone,
          message,
          linkUsed: metadata.linkUsed || null,
          status: 'SENT',
          simulated: true,
          success: true,
          sentAt: new Date(),
          idempotencyKey: metadata.idempotencyKey || null
        }
      });
      return { success: true, simulated: true, status: 'SENT' };
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
          data: {
            loanApplicationId: metadata.loanApplicationId || null,
            userId: metadata.userId || null,
            eventKey: metadata.eventKey || null,
            templateId: metadata.templateId || null,
            recipientPhone: formattedPhone,
            message,
            linkUsed: metadata.linkUsed || null,
            status: 'FAILED',
            success: false,
            error: errText,
            idempotencyKey: metadata.idempotencyKey || null
          }
        });
        return { success: false, error: errText, status: 'FAILED' };
      }

      const data = (await response.json()) as { id?: string };
      this.logger.log(`✅ [SMS SENT] Recipient: ${formattedPhone} | Gateway ID: ${data.id || 'N/A'}`);

      await this.prisma.smsLog.create({
        data: {
          loanApplicationId: metadata.loanApplicationId || null,
          userId: metadata.userId || null,
          eventKey: metadata.eventKey || null,
          templateId: metadata.templateId || null,
          recipientPhone: formattedPhone,
          message,
          linkUsed: metadata.linkUsed || null,
          gatewayId: data.id || null,
          status: 'SENT',
          success: true,
          sentAt: new Date(),
          idempotencyKey: metadata.idempotencyKey || null
        }
      });

      return { success: true, gatewayId: data.id, status: 'SENT' };
    } catch (err: any) {
      this.logger.error(`❌ [SMS EXCEPTION] ${err.message}`);
      await this.prisma.smsLog.create({
        data: {
          loanApplicationId: metadata.loanApplicationId || null,
          userId: metadata.userId || null,
          eventKey: metadata.eventKey || null,
          templateId: metadata.templateId || null,
          recipientPhone: formattedPhone,
          message,
          linkUsed: metadata.linkUsed || null,
          status: 'FAILED',
          success: false,
          error: err.message,
          idempotencyKey: metadata.idempotencyKey || null
        }
      });
      return { success: false, error: err.message, status: 'FAILED' };
    }
  }

  /** Render template body using active template and dynamic variables */
  async renderTemplate(
    eventKey: string,
    contextData: {
      loan?: any;
      user?: any;
      overrideVars?: Record<string, string | number>;
    } = {}
  ): Promise<{
    template: any;
    renderedMessage: string;
    linkUsed: string;
    unresolvedPlaceholders: string[];
  }> {
    let tpl = await this.prisma.smsTemplate.findUnique({ where: { key: eventKey } });

    if (!tpl) {
      const seedDef = DEFAULT_SMS_TEMPLATES.find(t => t.key === eventKey);
      if (seedDef) {
        try {
          tpl = await this.prisma.smsTemplate.create({
            data: {
              key: seedDef.key,
              title: seedDef.title,
              category: seedDef.category,
              description: seedDef.description,
              body: seedDef.body,
              variables: seedDef.variables,
              supportedPlaceholders: seedDef.supportedPlaceholders
            }
          });
        } catch {
          tpl = seedDef as any;
        }
      }
    }

    if (!tpl) {
      throw new BadRequestException(`SMS Template for event "${eventKey}" not found`);
    }

    const urls: PublicUrlsConfig = getPublicUrls();
    const loan = contextData.loan || {};
    const user = contextData.user || {};
    const override = contextData.overrideVars || {};

    const txRef = String(override.loanReference || loan.transactionRef || 'JL-000000');
    const firstName = String(override.firstName || loan.fullName?.split(' ')[0] || user.fullName?.split(' ')[0] || 'Valued Customer');
    const phoneNumber = String(override.phoneNumber || loan.phoneNumber || user.phoneNumber || '');
    const loanAmountStr = Number(override.loanAmount || loan.amount || 25000).toLocaleString();
    const allocatedAmountStr = Number(override.allocatedAmount || loan.allocatedBalance || loan.amount || 25000).toLocaleString();
    const withdrawalFeeStr = Number(override.withdrawalFee || loan.withdrawalFee || 150).toLocaleString();
    const repaymentAmountStr = Number(override.repaymentAmount || loan.repaymentAmount || loan.installmentAmount || 0).toLocaleString();
    const statusStr = String(override.status || loan.status || 'Processing');
    const rejectionReasonStr = String(override.rejectionReason || loan.allocationNotes || 'Details verification requirement');

    const linksMap: Record<string, string> = {
      applyLink: urls.apply,
      trackLink: urls.track(txRef),
      portalLink: urls.customerPortal,
      supportLink: urls.support()
    };

    // Primary link used for log audit based on event category
    let linkUsed = urls.track(txRef);
    if (tpl.category === 'APPROVAL' || tpl.category === 'FUNDS' || tpl.category === 'WITHDRAWAL' || tpl.category === 'REMINDERS') {
      linkUsed = urls.customerPortal;
    } else if (tpl.category === 'SYSTEM') {
      linkUsed = urls.apply;
    } else if (tpl.category === 'SUPPORT') {
      linkUsed = urls.support();
    }

    const dict: Record<string, string> = {
      firstName,
      phoneNumber,
      loanReference: txRef,
      loanAmount: loanAmountStr,
      allocatedAmount: allocatedAmountStr,
      withdrawalFee: withdrawalFeeStr,
      repaymentAmount: repaymentAmountStr,
      repaymentDate: 'in 30 days',
      status: statusStr,
      supportNumber: '0700000000',
      businessName: 'Jijenge Loans',
      applyLink: linksMap.applyLink,
      trackLink: linksMap.trackLink,
      portalLink: linksMap.portalLink,
      supportLink: linksMap.supportLink,
      rejectionReason: rejectionReasonStr,
      ...Object.fromEntries(Object.entries(override).map(([k, v]) => [k, String(v)]))
    };

    let renderedMessage = tpl.body;
    for (const [key, val] of Object.entries(dict)) {
      renderedMessage = renderedMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }

    // Check for unresolved placeholders
    const unresolvedMatches = renderedMessage.match(/\{[a-zA-Z0-9_]+\}/g) || [];
    const unresolvedPlaceholders = Array.from(new Set(unresolvedMatches));

    return {
      template: tpl,
      renderedMessage,
      linkUsed,
      unresolvedPlaceholders
    };
  }

  /** Trigger notification event via Notification Engine */
  async sendLoanEvent(dto: {
    event: string;
    applicationId?: string;
    userId?: string;
    phone?: string;
    eventVersion?: number;
    overrideVars?: Record<string, string | number>;
    ignoreSpamFilter?: boolean;
  }): Promise<{ success: boolean; gatewayId?: string; status?: string; error?: string; suppressed?: boolean }> {
    try {
      const eventKey = dto.event;
      let loan: any = null;
      let user: any = null;

      if (dto.applicationId) {
        loan = await this.prisma.loanApplication.findUnique({ where: { id: dto.applicationId } });
      }

      if (dto.userId) {
        user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      } else if (loan?.userId) {
        user = await this.prisma.user.findUnique({ where: { id: loan.userId } });
      }

      const recipientPhone = dto.phone || loan?.phoneNumber || user?.phoneNumber;
      if (!recipientPhone) {
        this.logger.warn(`⚠️ [NOTIFICATION SKIPPED] No recipient phone for event "${eventKey}"`);
        return { success: false, error: 'Recipient phone number is missing' };
      }

      // Render Active Template
      const { template, renderedMessage, linkUsed, unresolvedPlaceholders } = await this.renderTemplate(eventKey, {
        loan,
        user,
        overrideVars: dto.overrideVars
      });

      if (!template.active) {
        this.logger.log(`⏸️ [SMS TEMPLATE INACTIVE] Event template "${eventKey}" is disabled.`);
        return { success: false, error: `SMS template "${eventKey}" is currently disabled.` };
      }

      if (unresolvedPlaceholders.length > 0) {
        const err = `Unresolved placeholders detected: ${unresolvedPlaceholders.join(', ')}`;
        this.logger.error(`❌ [SMS VALIDATION ERROR] ${err} for template ${eventKey}`);
        await this.prisma.smsLog.create({
          data: {
            loanApplicationId: dto.applicationId || null,
            userId: dto.userId || null,
            eventKey,
            templateId: template.id,
            recipientPhone,
            message: renderedMessage,
            linkUsed,
            status: 'FAILED',
            success: false,
            error: err
          }
        });
        return { success: false, error: err, status: 'FAILED' };
      }

      // Generate unique Idempotency Key
      const version = dto.eventVersion || 1;
      const idempotencyKey = dto.applicationId ? `${dto.applicationId}_${eventKey}_v${version}` : undefined;

      return this.sendSms(recipientPhone, renderedMessage, dto.ignoreSpamFilter ?? true, {
        loanApplicationId: dto.applicationId,
        userId: dto.userId || loan?.userId,
        eventKey,
        templateId: template.id,
        linkUsed,
        idempotencyKey
      });
    } catch (err: any) {
      this.logger.error(`Failed to send loan event SMS (${dto.event}): ${err?.message}`, err.stack);
      return { success: false, error: err?.message };
    }
  }

  /** Trigger status-gated SMS on loan application status changes */
  async triggerStatusSms(loan: any, status: LoanStatus | string) {
    if (!loan || !loan.phoneNumber) return;
    const rawStatus = String(status || '').trim();
    const eventKey = STATUS_TO_EVENT_KEY[rawStatus] || STATUS_TO_EVENT_KEY[rawStatus.replace(/\s+/g, '_')];
    if (!eventKey) return;

    return this.sendLoanEvent({
      event: eventKey,
      applicationId: loan.id,
      userId: loan.userId,
      phone: loan.phoneNumber
    });
  }

  /** Run automated reminder checks */
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
        const res = await this.sendLoanEvent({
          event: 'APPLICATION_REMINDER',
          applicationId: loan.id,
          userId: loan.userId,
          phone: loan.phoneNumber
        });
        if (res.success) processed24hCount++;
      }

      // 2. 7-Day Unwithdrawn / Repayment Reminders
      const sevenDaysAgoMin = new Date(Date.now() - (7 * 24 + 12) * 60 * 60 * 1000);
      const sevenDaysAgoMax = new Date(Date.now() - (7 * 24 - 12) * 60 * 60 * 1000);

      const active7dLoans = await this.prisma.loanApplication.findMany({
        where: {
          updatedAt: { gte: sevenDaysAgoMin, lte: sevenDaysAgoMax },
          status: { in: [LoanStatus.Approved] }
        }
      });

      for (const loan of active7dLoans) {
        const res = await this.sendLoanEvent({
          event: 'WITHDRAWAL_REMINDER',
          applicationId: loan.id,
          userId: loan.userId,
          phone: loan.phoneNumber
        });
        if (res.success) processed7dCount++;
      }

      return { success: true, processed24hCount, processed7dCount };
    } catch (err: any) {
      this.logger.error(`Failed to trigger reminders: ${err?.message}`);
      return { success: false, processed24hCount, processed7dCount };
    }
  }

  /** Seed standard sensible default templates */
  async seedDefaultSmsTemplates() {
    for (const seed of DEFAULT_SMS_TEMPLATES) {
      try {
        await this.prisma.smsTemplate.upsert({
          where: { key: seed.key },
          create: {
            key: seed.key,
            title: seed.title,
            category: seed.category,
            description: seed.description,
            body: seed.body,
            variables: seed.variables,
            supportedPlaceholders: seed.supportedPlaceholders
          },
          update: {
            title: seed.title,
            category: seed.category,
            description: seed.description,
            supportedPlaceholders: seed.supportedPlaceholders
          }
        });
      } catch { /* ignored */ }
    }
    return this.getSmsTemplates();
  }

  /** Retrieve all SMS templates with default seeding fallback */
  async getSmsTemplates() {
    try {
      let items = await this.prisma.smsTemplate.findMany({ orderBy: { key: 'asc' } });
      if (!items || items.length === 0) {
        await this.seedDefaultSmsTemplates();
        items = await this.prisma.smsTemplate.findMany({ orderBy: { key: 'asc' } });
      }
      return { success: true, items };
    } catch (err: any) {
      this.logger.error(`Failed to fetch SMS templates: ${err?.message}`);
      return { success: true, items: DEFAULT_SMS_TEMPLATES };
    }
  }

  /** Create or update an SMS template */
  async upsertSmsTemplate(body: {
    key: string;
    title: string;
    body: string;
    category?: string;
    description?: string;
    notes?: string;
    variables?: string[];
    supportedPlaceholders?: string[];
    adminEmail?: string;
  }) {
    const key = String(body.key || '').trim().toUpperCase();
    if (!key) throw new Error('Template key is required');

    const template = await this.prisma.smsTemplate.upsert({
      where: { key },
      create: {
        key,
        title: body.title || key,
        category: body.category || 'APPLICATION',
        description: body.description || '',
        notes: body.notes || '',
        body: body.body || '',
        variables: body.variables || [],
        supportedPlaceholders: body.supportedPlaceholders || body.variables || [],
        updatedBy: body.adminEmail || 'admin'
      },
      update: {
        title: body.title,
        category: body.category,
        description: body.description,
        notes: body.notes,
        body: body.body,
        variables: body.variables || [],
        supportedPlaceholders: body.supportedPlaceholders || body.variables || [],
        updatedBy: body.adminEmail || 'admin'
      }
    });

    return { success: true, item: template };
  }

  /** Toggle SMS template active status */
  async toggleSmsTemplate(idOrKey: string, active: boolean) {
    try {
      const template = await this.prisma.smsTemplate.findFirst({
        where: {
          OR: [{ id: idOrKey }, { key: idOrKey }]
        }
      });

      if (!template) {
        throw new Error('SMS template not found');
      }

      const updated = await this.prisma.smsTemplate.update({
        where: { id: template.id },
        data: { active }
      });

      return { success: true, item: updated };
    } catch (e: any) {
      this.logger.error(`Error toggling SMS template ${idOrKey}: ${e?.message}`);
      return { success: true, item: { id: idOrKey, key: idOrKey, active } };
    }
  }

  /** Safe Template Preview Generator for Admin */
  async previewTemplate(
    key: string,
    sampleValues: Record<string, string> = {}
  ): Promise<{
    renderedMessage: string;
    charCount: number;
    segmentCount: number;
    isUnicode: boolean;
    placeholdersUsed: string[];
    unresolvedPlaceholders: string[];
  }> {
    const { renderedMessage, unresolvedPlaceholders } = await this.renderTemplate(key, {
      overrideVars: sampleValues
    });

    const metrics = calculateSmsSegments(renderedMessage);

    const matches = renderedMessage.match(/\{[a-zA-Z0-9_]+\}/g) || [];
    const placeholdersUsed = Array.from(new Set(matches));

    return {
      renderedMessage,
      charCount: metrics.charCount,
      segmentCount: metrics.segmentCount,
      isUnicode: metrics.isUnicode,
      placeholdersUsed,
      unresolvedPlaceholders
    };
  }
}
