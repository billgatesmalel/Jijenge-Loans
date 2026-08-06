import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { LoanStatus, FeeStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService
  ) {}

  async getAnalytics() {
    const totalApplications = await this.prisma.loanApplication.count();
    const paidApplications = await this.prisma.loanApplication.count({
      where: { feeStatus: FeeStatus.Paid }
    });
    const approvedApplications = await this.prisma.loanApplication.count({
      where: { status: LoanStatus.Approved }
    });
    const disbursedApplications = await this.prisma.loanApplication.count({
      where: { status: LoanStatus.Disbursed }
    });

    const revenueResult = await this.prisma.loanApplication.aggregate({
      _sum: { amountPaid: true }
    });

    const totalAllocatedResult = await this.prisma.loanApplication.aggregate({
      _sum: { allocatedBalance: true }
    });

    const totalRevenue = revenueResult._sum.amountPaid || 0;
    const totalAllocated = totalAllocatedResult._sum.allocatedBalance || 0;
    const conversionRate = totalApplications > 0 ? Math.round((paidApplications / totalApplications) * 100) : 0;

    return {
      success: true,
      metrics: {
        totalApplications,
        paidApplications,
        approvedApplications,
        disbursedApplications,
        totalRevenue,
        totalAllocated,
        conversionRate
      }
    };
  }

  async getApplications(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status as LoanStatus;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
        { nationalId: { contains: s } },
        { transactionRef: { contains: s, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.loanApplication.count({ where })
    ]);

    return {
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async allocateBalance(loanId: string, amount: number, notes: string, adminEmail: string) {
    const loan = await this.prisma.loanApplication.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan record not found');
    }

    const updated = await this.prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        allocatedBalance: amount,
        allocationNotes: notes || 'Allocated by administrator',
        allocationDate: new Date(),
        allocatedBy: adminEmail,
        status: LoanStatus.Approved
      }
    });

    const msg = `Dear ${loan.fullName}, your Jijenge Loan balance of KSh ${amount.toLocaleString()} (Ref: ${loan.transactionRef}) has been allocated! Log into your dashboard to withdraw.`;
    this.smsService.sendSms(loan.phoneNumber, msg).catch(() => {});

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'ALLOCATE_LOAN_BALANCE',
        target: loan.transactionRef,
        metadata: `Amount: KSh ${amount}`
      }
    });

    return { success: true, message: 'Balance allocated successfully', loan: updated };
  }

  async updateLoanStatus(loanId: string, status: LoanStatus, adminEmail: string) {
    const loan = await this.prisma.loanApplication.update({
      where: { id: loanId },
      data: { status }
    });

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'UPDATE_LOAN_STATUS',
        target: loan.transactionRef,
        metadata: `New Status: ${status}`
      }
    });

    return { success: true, loan };
  }
}
