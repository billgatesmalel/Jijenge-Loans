import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiOperation({ summary: 'Get System Contact & Support Settings' })
  @Get('settings')
  async getSettings() {
    return this.supportService.getSettings();
  }

  @ApiOperation({ summary: 'Update System Contact & Support Settings' })
  @Put('settings')
  async updateSettings(@Body() body: any) {
    return this.supportService.updateSettings(body);
  }

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

  @ApiOperation({ summary: 'Get Support Ticket By ID / Token' })
  @Get('tickets/:id')
  async getTicketById(@Param('id') ticketId: string) {
    return this.supportService.getTicketById(ticketId);
  }
}

