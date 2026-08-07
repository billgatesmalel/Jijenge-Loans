import { Controller, Get, Post, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LoanStatus } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Get Dashboard Analytics KPIs' })
  @Get('analytics')
  async getAnalytics(@Request() req: any) {
    return this.adminService.getAnalytics();
  }

  @ApiOperation({ summary: 'List & Filter All Loan Applications' })
  @Get('applications')
  async getApplications(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.adminService.getApplications({ page, limit, status, search });
  }

  @ApiOperation({ summary: 'Allocate Loan Balance to Customer Account' })
  @Post('allocate-balance')
  async allocateBalance(
    @Request() req: any,
    @Body() body: { loanId: string; amount: number; notes: string }
  ) {
    const adminIdentifier = req.user.email || req.user.phone || req.user.userId;
    return this.adminService.allocateBalance(body.loanId, body.amount, body.notes, adminIdentifier);
  }

  @ApiOperation({ summary: 'Update Loan Application Status' })
  @Post('update-status')
  async updateStatus(
    @Request() req: any,
    @Body() body: { loanId: string; status: LoanStatus }
  ) {
    const adminIdentifier = req.user.email || req.user.phone || req.user.userId;
    return this.adminService.updateLoanStatus(body.loanId, body.status, adminIdentifier);
  }
}
