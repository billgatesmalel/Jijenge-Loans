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

  async getCustomers(query: { search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
        { nationalId: { contains: s } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.user.count({ where })
    ]);

    return { success: true, items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPayments(query: { search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      checkoutRequestId: { not: null }
    };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
        { transactionRef: { contains: s, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.loanApplication.count({ where })
    ]);

    return { success: true, items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEligibilityBrackets() {
    const items = await this.prisma.eligibilityBracket.findMany({
      orderBy: { minSalary: 'asc' }
    });
    return { success: true, items };
  }

  async createEligibilityBracket(body: { name: string; minSalary: number; maxSalary: number; assignedPackageName: string; maxLimit: number }, adminEmail: string) {
    const bracket = await this.prisma.eligibilityBracket.create({
      data: {
        name: body.name,
        minSalary: Number(body.minSalary),
        maxSalary: Number(body.maxSalary),
        assignedPackageName: body.assignedPackageName,
        maxLimit: Number(body.maxLimit)
      }
    });

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'CREATE_ELIGIBILITY_BRACKET',
        target: body.name,
        metadata: `Max Limit: ${body.maxLimit}`
      }
    });

    return { success: true, bracket };
  }

  async updateEligibilityBracket(id: number, body: { name?: string; minSalary?: number; maxSalary?: number; assignedPackageName?: string; maxLimit?: number; active?: boolean }, adminEmail: string) {
    const bracket = await this.prisma.eligibilityBracket.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.minSalary !== undefined && { minSalary: Number(body.minSalary) }),
        ...(body.maxSalary !== undefined && { maxSalary: Number(body.maxSalary) }),
        ...(body.assignedPackageName !== undefined && { assignedPackageName: body.assignedPackageName }),
        ...(body.maxLimit !== undefined && { maxLimit: Number(body.maxLimit) }),
        ...(body.active !== undefined && { active: body.active })
      }
    });

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'UPDATE_ELIGIBILITY_BRACKET',
        target: String(id),
        metadata: JSON.stringify(body)
      }
    });

    return { success: true, bracket };
  }

  async deleteEligibilityBracket(id: number, adminEmail: string) {
    const bracket = await this.prisma.eligibilityBracket.delete({
      where: { id }
    });

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'DELETE_ELIGIBILITY_BRACKET',
        target: String(id)
      }
    });

    return { success: true, bracket };
  }

  async getSmsLogs(query: { search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { recipientPhone: { contains: s } },
        { message: { contains: s, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.smsLog.count({ where })
    ]);

    return { success: true, items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async sendSms(phone: string, message: string, adminEmail: string) {
    const res = await this.smsService.sendSms(phone, message);

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'SEND_MANUAL_SMS',
        target: phone,
        metadata: message.substring(0, 100)
      }
    });

    return { success: true, ...res };
  }

  async getSmsTemplates() {
    const items = await this.prisma.smsTemplate.findMany({
      orderBy: { key: 'asc' }
    });
    return { success: true, items };
  }

  async upsertSmsTemplate(body: { key: string; title: string; body: string; variables?: string[] }, adminEmail: string) {
    const template = await this.prisma.smsTemplate.upsert({
      where: { key: body.key },
      create: {
        key: body.key,
        title: body.title,
        body: body.body,
        variables: body.variables || []
      },
      update: {
        title: body.title,
        body: body.body,
        variables: body.variables || []
      }
    });

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'UPSERT_SMS_TEMPLATE',
        target: body.key
      }
    });

    return { success: true, template };
  }

  async resolveSupportTicket(id: string, status: string, adminEmail: string) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: { status }
    });

    await this.prisma.auditLog.create({
      data: {
        adminEmail,
        action: 'RESOLVE_SUPPORT_TICKET',
        target: id,
        metadata: `New Status: ${status}`
      }
    });

    return { success: true, ticket };
  }
}
