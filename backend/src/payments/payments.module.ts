import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PalplussProvider } from './providers/palpluss.provider';
import { GravityPayProvider } from './providers/gravitypay.provider';
import { PaymentGatewayManager } from './payment-gateway.manager';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  providers: [
    PaymentsService,
    PaymentGatewayManager,
    PalplussProvider,
    GravityPayProvider
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentGatewayManager]
})
export class PaymentsModule {}
