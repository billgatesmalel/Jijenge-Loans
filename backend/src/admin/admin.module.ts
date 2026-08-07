import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  providers: [AdminService, RolesGuard, Reflector],
  controllers: [AdminController],
  exports: [AdminService]
})
export class AdminModule {}

