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
          include: {
            withdrawals: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const latestLoan = user.loanApplications[0] || null;
    const totalAllocated = user.loanApplications.reduce((acc, l) => acc + (l.allocatedBalance || 0), 0);

    const allWithdrawals = user.loanApplications.flatMap(l =>
      l.withdrawals.map(w => ({
        ...w,
        transactionRef: l.transactionRef,
        packageName: l.packageName
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        nationalId: user.nationalId,
        county: user.county,
        townArea: user.townArea
      },
      latestLoan,
      totalAllocatedBalance: totalAllocated,
      loanApplications: user.loanApplications,
      withdrawals: allWithdrawals
    };
  }

  async withdrawFunds(userId: string, loanId: string, amount: number) {
    const loan = await this.prisma.loanApplication.findFirst({
      where: { id: loanId, userId }
    });

    if (!loan) {
      throw new NotFoundException('Loan application record not found');
    }

    const currentAllocated = loan.allocatedBalance || 0;
    if (currentAllocated < amount || amount <= 0) {
      throw new BadRequestException(`Insufficient allocated loan balance. Available: KSh ${currentAllocated.toLocaleString()}`);
    }

    const withdrawalFee = Math.round(amount * 0.02) || 150;
    const newAllocatedBalance = currentAllocated - amount;

    // Deduct requested amount from allocated balance and create withdrawal record
    const [updatedLoan, withdrawal] = await Promise.all([
      this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: { allocatedBalance: newAllocatedBalance }
      }),
      this.prisma.withdrawal.create({
        data: {
          loanApplicationId: loan.id,
          amount,
          withdrawalFee,
          status: WithdrawalStatus.Pending,
          checkoutRequestId: `WD_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        }
      })
    ]);

    // Send WITHDRAWAL_REQUESTED SMS template
    this.smsService.sendTemplateSms('WITHDRAWAL_REQUESTED', loan.phoneNumber, {
      fullName: loan.fullName,
      amount: amount.toLocaleString(),
      txRef: loan.transactionRef,
      processingFee: withdrawalFee.toLocaleString()
    }).catch(() => {});

    return {
      success: true,
      message: `Withdrawal request for KSh ${amount.toLocaleString()} submitted. Pay processing fee of KSh ${withdrawalFee.toLocaleString()} to complete.`,
      withdrawal,
      remainingAllocatedBalance: updatedLoan.allocatedBalance
    };
  }

  async payWithdrawalFee(userId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { loanApplication: true }
    });

    if (!withdrawal || withdrawal.loanApplication.userId !== userId) {
      throw new NotFoundException('Withdrawal record not found');
    }

    const updatedWithdrawal = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.Pending,
        resultDesc: 'Withdrawal fee paid successfully. Disbursal processing.'
      }
    });

    const loan = withdrawal.loanApplication;

    // Send WITHDRAWAL_FEE_PAID SMS template
    this.smsService.sendTemplateSms('WITHDRAWAL_FEE_PAID', loan.phoneNumber, {
      fullName: loan.fullName,
      processingFee: withdrawal.withdrawalFee.toLocaleString(),
      txRef: loan.transactionRef,
      amount: withdrawal.amount.toLocaleString()
    }).catch(() => {});

    return {
      success: true,
      message: 'Withdrawal processing fee payment confirmed! Funds are processing to M-Pesa.',
      withdrawal: updatedWithdrawal
    };
  }

  async updateProfile(userId: string, body: { fullName?: string; nationalId?: string; phoneNumber?: string; county?: string; townArea?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const dataToUpdate: any = {};
    if (body.fullName) dataToUpdate.fullName = body.fullName.trim();
    if (body.nationalId) dataToUpdate.nationalId = body.nationalId.trim();
    if (body.phoneNumber) dataToUpdate.phoneNumber = body.phoneNumber.replace(/\D/g, '');
    if (body.county) dataToUpdate.county = body.county.trim();
    if (body.townArea) dataToUpdate.townArea = body.townArea.trim();

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    // Update associated loan applications with updated profile details
    await this.prisma.loanApplication.updateMany({
      where: { userId },
      data: {
        ...(body.fullName ? { fullName: body.fullName.trim() } : {}),
        ...(body.nationalId ? { nationalId: body.nationalId.trim() } : {}),
        ...(body.phoneNumber ? { phoneNumber: body.phoneNumber.replace(/\D/g, '') } : {}),
        ...(body.county ? { county: body.county.trim() } : {}),
        ...(body.townArea ? { townArea: body.townArea.trim() } : {})
      }
    });

    return {
      success: true,
      message: 'Profile details updated successfully. You can now proceed with your withdrawal.',
      user: updatedUser
    };
  }
}
