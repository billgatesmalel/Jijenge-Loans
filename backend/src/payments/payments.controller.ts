import { Controller, Post, Get, All, Body, Param, Query, Headers, Req } from '@nestjs/common';
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
  @Get(['payments/status/:txRef', 'payments/status/ref/:txRef'])
  async checkPaymentStatus(@Param('txRef') txRef: string) {
    return this.paymentsService.checkPaymentStatus(txRef);
  }

  @ApiOperation({ summary: 'GravityPay M-Pesa Callback Webhook Endpoint' })
  @All('payments/callback/gravitypay')
  async handleGravityPayWebhook(
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any
  ) {
    return this.paymentsService.handleGravityPayWebhook(body, headers, query);
  }

  @ApiOperation({ summary: 'Palplus M-Pesa Callback Webhook Endpoint' })
  @All('payments/callback/palpluss')
  async handlePalplussWebhook(
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any
  ) {
    return this.paymentsService.handlePalplussWebhook(body, headers, query);
  }

  @ApiOperation({ summary: 'Unified M-Pesa Callback Webhook Endpoint (Auto-Detects Gateway)' })
  @All('payments/callback')
  async handleUnifiedWebhook(
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any
  ) {
    return this.paymentsService.handleUnifiedWebhook(body, headers, query);
  }

  @ApiOperation({ summary: 'Legacy PalPluss M-Pesa Callback Webhook Endpoint' })
  @All(['webhooks/mpesa', 'palpluss-callback', 'api/palpluss-callback', 'api/webhooks/mpesa', 'mpesa'])
  async handleMpesaWebhook(
    @Body() body: any,
    @Query('secret') secretQuery?: string,
    @Query('token') tokenQuery?: string,
    @Query('key') keyQuery?: string,
    @Headers('x-webhook-secret') headerSecret?: string,
    @Headers('x-api-key') headerApiKey?: string,
    @Headers() allHeaders?: any,
    @Query() allQuery?: any
  ) {
    const secret = secretQuery || tokenQuery || keyQuery || headerSecret || headerApiKey || body?.secret || body?.token;
    return this.paymentsService.handleUnifiedWebhook(body, allHeaders, { ...allQuery, secret });
  }
}
