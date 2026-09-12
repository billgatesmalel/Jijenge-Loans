import { Controller, Get, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({ summary: 'Get Customer Dashboard & Balance Overview' })
  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.customerService.getDashboard(req.user.userId);
  }

  @ApiOperation({ summary: 'Withdraw Allocated Loan Balance to M-Pesa' })
  @Post('withdraw')
  async withdrawFunds(@Request() req: any, @Body() body: { loanId: string; amount: number }) {
    return this.customerService.withdrawFunds(req.user.userId, body.loanId, Number(body.amount));
  }

  @ApiOperation({ summary: 'Confirm Withdrawal Fee Payment' })
  @Post('pay-withdrawal-fee')
  async payWithdrawalFee(@Request() req: any, @Body() body: { withdrawalId: string }) {
    return this.customerService.payWithdrawalFee(req.user.userId, body.withdrawalId);
  }

  @ApiOperation({ summary: 'Update Customer Profile & Identification Details' })
  @Put('profile')
  async updateProfile(
    @Request() req: any,
    @Body() body: { fullName?: string; nationalId?: string; phoneNumber?: string; county?: string; townArea?: string }
  ) {
    return this.customerService.updateProfile(req.user.userId, body);
  }
}
