import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Initiate M-Pesa STK Push for Processing Fee' })
  @Post('payments/stkpush')
  async initiateStkPush(@Body() body: { transactionRef?: string; txRef?: string; phoneNumber?: string; phone?: string }) {
    const txRef = body.transactionRef || body.txRef || '';
    const phone = body.phoneNumber || body.phone || '';
    return this.paymentsService.initiateStkPush(txRef, phone);
  }

  @ApiOperation({ summary: 'Check M-Pesa Payment Status' })
  @Get('payments/status/:txRef')
  async checkPaymentStatus(@Param('txRef') txRef: string) {
    return this.paymentsService.checkPaymentStatus(txRef);
  }

  @ApiOperation({ summary: 'PalPluss M-Pesa Callback Webhook Endpoint' })
  @Post('webhooks/mpesa')
  async handleMpesaWebhook(@Body() body: any, @Query('secret') secret: string) {
    return this.paymentsService.handleMpesaWebhook(body, secret);
  }
}
