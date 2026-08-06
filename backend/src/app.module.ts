import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { AuthModule } from './auth/auth.module';
import { LoansModule } from './loans/loans.module';
import { PaymentsModule } from './payments/payments.module';
import { CustomerModule } from './customer/customer.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    SmsModule,
    AuthModule,
    LoansModule,
    PaymentsModule,
    CustomerModule,
    AdminModule,
    SupportModule
  ]
})
export class AppModule {}
