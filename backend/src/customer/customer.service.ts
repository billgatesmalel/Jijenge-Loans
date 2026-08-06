import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { WithdrawalStatus } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService
  ) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        loanApplications: {
          orderBy: { createdAt: 'desc' },
          include: { withdrawals: true }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const latestLoan = user.loanApplications[0] || null;
    const totalAllocated = user.loanApplications.reduce((acc, l) => acc + (l.allocatedBalance || 0), 0);

    return {
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        nationalId: user.nationalId,
        county: user.county
      },
      latestLoan,
      totalAllocatedBalance: totalAllocated,
      loanApplications: user.loanApplications
    };
  }

  async withdrawFunds(userId: string, loanId: string, amount: number) {
    const loan = await this.prisma.loanApplication.findFirst({
      where: { id: loanId, userId }
    });

    if (!loan) {
      throw new NotFoundException('Loan application record not found');
    }

    if (!loan.allocatedBalance || loan.allocatedBalance < amount) {
      throw new BadRequestException(`Insufficient allocated loan balance. Available: KSh ${loan.allocatedBalance || 0}`);
    }

    const withdrawalFee = Math.round(amount * 0.02) || 50;

    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        loanApplicationId: loan.id,
        amount,
        withdrawalFee,
        status: WithdrawalStatus.Pending,
        checkoutRequestId: `WD_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      }
    });

    const msg = `Dear ${loan.fullName}, your withdrawal request of KSh ${amount.toLocaleString()} (Ref: ${loan.transactionRef}) has been received and is processing to M-Pesa ${loan.phoneNumber}.`;
    this.smsService.sendSms(loan.phoneNumber, msg).catch(() => {});

    return {
      success: true,
      message: 'Withdrawal request submitted successfully. Processing to M-Pesa.',
      withdrawal
    };
  }
}
