import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

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
}
