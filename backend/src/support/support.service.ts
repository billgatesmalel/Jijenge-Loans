import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_SETTINGS = {
  supportPhone: '+254 700 123 456',
  supportEmail: 'support@jijengeloans.co.ke',
  supportWhatsapp: '+254 700 123 456',
  supportHours: '24/7 Customer Support',
  headquartersAddress: 'Nairobi, Kenya',
};

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    try {
      const rows = await this.prisma.systemSetting.findMany();
      const settingsMap: Record<string, string> = {};
      rows.forEach(r => { settingsMap[r.key] = r.value; });
      return {
        success: true,
        settings: {
          supportPhone: settingsMap['support_phone'] || DEFAULT_SETTINGS.supportPhone,
          supportEmail: settingsMap['support_email'] || DEFAULT_SETTINGS.supportEmail,
          supportWhatsapp: settingsMap['support_whatsapp'] || DEFAULT_SETTINGS.supportWhatsapp,
          supportHours: settingsMap['support_hours'] || DEFAULT_SETTINGS.supportHours,
          headquartersAddress: settingsMap['headquarters_address'] || DEFAULT_SETTINGS.headquartersAddress,
        }
      };
    } catch (e) {
      return { success: true, settings: DEFAULT_SETTINGS };
    }
  }

  async updateSettings(settings: Partial<typeof DEFAULT_SETTINGS>) {
    const keyMap: Record<string, string> = {
      supportPhone: 'support_phone',
      supportEmail: 'support_email',
      supportWhatsapp: 'support_whatsapp',
      supportHours: 'support_hours',
      headquartersAddress: 'headquarters_address',
    };

    try {
      for (const [prop, value] of Object.entries(settings)) {
        const key = keyMap[prop];
        if (key && typeof value === 'string') {
          await this.prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }
      }
      return this.getSettings();
    } catch (e: any) {
      return { success: true, settings: { ...DEFAULT_SETTINGS, ...settings } };
    }
  }

  async createTicket(customerPhone: string, customerName: string, subject: string, initialMessage: string) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        customerPhone,
        customerName,
        subject: subject || 'General Loan Inquiry',
        status: 'OPEN',
        messages: {
          create: {
            sender: 'CUSTOMER',
            senderName: customerName,
            text: initialMessage
          }
        }
      },
      include: { messages: true }
    });
    return { success: true, ticket };
  }

  async getTickets(phone?: string) {
    const where = phone ? { customerPhone: phone } : {};
    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    return { success: true, tickets };
  }

  async addMessage(ticketId: string, sender: string, senderName: string, text: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        sender,
        senderName,
        text
      }
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    return { success: true, message };
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return { success: true, ticket };
  }
}

