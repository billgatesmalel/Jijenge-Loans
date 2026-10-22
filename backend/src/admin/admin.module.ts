import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../auth/roles.guard';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  providers: [AdminService, RolesGuard, Reflector],
  controllers: [AdminController],
  exports: [AdminService]
})
export class AdminModule {}
