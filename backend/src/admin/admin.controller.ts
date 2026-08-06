import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoanStatus } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Get Dashboard Analytics KPIs' })
  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @ApiOperation({ summary: 'List & Filter All Loan Applications' })
  @Get('applications')
  async getApplications(
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
    return this.adminService.allocateBalance(body.loanId, body.amount, body.notes, req.user.email);
  }

  @ApiOperation({ summary: 'Update Loan Application Status' })
  @Post('update-status')
  async updateStatus(
    @Request() req: any,
    @Body() body: { loanId: string; status: LoanStatus }
  ) {
    return this.adminService.updateLoanStatus(body.loanId, body.status, req.user.email);
  }
}
