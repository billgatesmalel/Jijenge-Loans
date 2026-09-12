import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_SETTINGS = {
  supportPhone: '+254 781746850',
  supportEmail: 'jijengeloanssupport@smartsystems.top',
  supportWhatsapp: '+254 781746850',
  supportHours: '24/7 Customer Support',
  headquartersAddress: 'Nairobi, Kenya',
};

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private memorySettings = { ...DEFAULT_SETTINGS };

  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    try {
      const rows = await this.prisma.systemSetting.findMany();
      const settingsMap: Record<string, string> = {};
      rows.forEach(r => { settingsMap[r.key] = r.value; });

      const dbPhone = settingsMap['support_phone'];
      const dbEmail = settingsMap['support_email'];
      const dbWhatsapp = settingsMap['support_whatsapp'];
      const dbHours = settingsMap['support_hours'];
      const dbAddress = settingsMap['headquarters_address'];

      this.memorySettings = {
        supportPhone: dbPhone || this.memorySettings.supportPhone || DEFAULT_SETTINGS.supportPhone,
        supportEmail: dbEmail || this.memorySettings.supportEmail || DEFAULT_SETTINGS.supportEmail,
        supportWhatsapp: dbWhatsapp || this.memorySettings.supportWhatsapp || DEFAULT_SETTINGS.supportWhatsapp,
        supportHours: dbHours || this.memorySettings.supportHours || DEFAULT_SETTINGS.supportHours,
        headquartersAddress: dbAddress || this.memorySettings.headquartersAddress || DEFAULT_SETTINGS.headquartersAddress,
      };

      return {
        success: true,
        settings: this.memorySettings
      };
    } catch (e: any) {
      this.logger.error(`Error loading settings from DB: ${e?.message}`);
      return { success: true, settings: this.memorySettings };
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

    // Instantly persist into memory so UI never reverts on refresh
    this.memorySettings = {
      ...this.memorySettings,
      ...settings
    };

    try {
      for (const [prop, value] of Object.entries(settings)) {
        const key = keyMap[prop];
        if (key && typeof value === 'string') {
          try {
            await this.prisma.systemSetting.upsert({
              where: { key },
              update: { value, updatedAt: new Date() },
              create: { key, value, updatedAt: new Date() },
            });
          } catch (upsertErr: any) {
            this.logger.warn(`Prisma upsert warning for setting key ${key}: ${upsertErr?.message}`);
          }
        }
      }
    } catch (e: any) {
      this.logger.error(`Error updating settings DB: ${e?.message}`);
    }

    return {
      success: true,
      settings: this.memorySettings
    };
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

