import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiOperation({ summary: 'Create Support Inquiry Ticket' })
  @Post('ticket')
  async createTicket(@Body() body: { customerPhone: string; customerName: string; subject: string; message: string }) {
    return this.supportService.createTicket(body.customerPhone, body.customerName, body.subject, body.message);
  }

  @ApiOperation({ summary: 'Get Customer Support Tickets' })
  @Get('tickets')
  async getTickets(@Query('phone') phone?: string) {
    return this.supportService.getTickets(phone);
  }

  @ApiOperation({ summary: 'Post Message to Support Ticket' })
  @Post('tickets/:id/message')
  async addMessage(
    @Param('id') ticketId: string,
    @Body() body: { sender: string; senderName: string; text: string }
  ) {
    return this.supportService.addMessage(ticketId, body.sender, body.senderName, body.text);
  }
}
