import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendSms(recipientPhone: string, message: string): Promise<{ success: boolean; gatewayId?: string; simulated?: boolean; error?: string }> {
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
}
