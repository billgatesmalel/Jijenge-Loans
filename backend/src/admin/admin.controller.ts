import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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

  @ApiOperation({ summary: 'Get All Registered Customers' })
  @Get('customers')
  async getCustomers(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.adminService.getCustomers({ search, page, limit });
  }

  @ApiOperation({ summary: 'Get M-Pesa STK Transactions' })
  @Get('payments')
  async getPayments(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.adminService.getPayments({ search, page, limit });
  }

  @ApiOperation({ summary: 'Get All Eligibility Brackets' })
  @Get('eligibility-brackets')
  async getEligibilityBrackets() {
    return this.adminService.getEligibilityBrackets();
  }

  @ApiOperation({ summary: 'Create Eligibility Bracket' })
  @Post('eligibility-brackets')
  async createEligibilityBracket(
    @Request() req: any,
    @Body() body: { name: string; minSalary: number; maxSalary: number; assignedPackageName: string; maxLimit: number; processingFee?: number }
  ) {
    const adminIdentifier = req.user?.email || req.user?.phone || req.user?.userId || 'admin@jijengeloans.co.ke';
    return this.adminService.createEligibilityBracket(body, adminIdentifier);
  }

  @ApiOperation({ summary: 'Update Eligibility Bracket' })
  @Put('eligibility-brackets/:id')
  async updateEligibilityBracket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; minSalary?: number; maxSalary?: number; assignedPackageName?: string; maxLimit?: number; processingFee?: number; active?: boolean }
  ) {
    const adminIdentifier = req.user?.email || req.user?.phone || req.user?.userId || 'admin@jijengeloans.co.ke';
    return this.adminService.updateEligibilityBracket(Number(id), body, adminIdentifier);
  }

  @ApiOperation({ summary: 'Delete Eligibility Bracket' })
  @Delete('eligibility-brackets/:id')
  async deleteEligibilityBracket(
    @Request() req: any,
    @Param('id') id: string
  ) {
    const adminIdentifier = req.user?.email || req.user?.phone || req.user?.userId || 'admin@jijengeloans.co.ke';
    return this.adminService.deleteEligibilityBracket(Number(id), adminIdentifier);
  }

  @ApiOperation({ summary: 'Get SMS Logs' })
  @Get('sms-logs')
  async getSmsLogs(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.adminService.getSmsLogs({ search, page, limit });
  }

  @ApiOperation({ summary: 'Send Manual SMS' })
  @Post('send-sms')
  async sendSms(
    @Request() req: any,
    @Body() body: { phone: string; message: string }
  ) {
    const adminIdentifier = req.user.email || req.user.phone || req.user.userId;
    return this.adminService.sendSms(body.phone, body.message, adminIdentifier);
  }

  @ApiOperation({ summary: 'Get SMS Templates' })
  @Get('sms-templates')
  async getSmsTemplates() {
    return this.adminService.getSmsTemplates();
  }

  @ApiOperation({ summary: 'Create/Update SMS Template' })
  @Post('sms-templates')
  async upsertSmsTemplate(
    @Request() req: any,
    @Body() body: { key: string; title: string; body: string; variables?: string[] }
  ) {
    const adminIdentifier = req.user.email || req.user.phone || req.user.userId;
    return this.adminService.upsertSmsTemplate(body, adminIdentifier);
  }

  @ApiOperation({ summary: 'Resolve Support Ticket' })
  @Put('support-tickets/:id/resolve')
  async resolveSupportTicket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const adminIdentifier = req.user.email || req.user.phone || req.user.userId;
    return this.adminService.resolveSupportTicket(id, body.status || 'RESOLVED', adminIdentifier);
  }
}
