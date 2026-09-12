import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { LoanStatus, FeeStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'ALLOCATE_LOAN_BALANCE',
          target: loan.transactionRef,
          metadata: `Amount: KSh ${amount}`
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, message: 'Balance allocated successfully', loan: updated };
  }

  async updateLoanStatus(loanId: string, status: LoanStatus, adminEmail: string) {
    const loan = await this.prisma.loanApplication.update({
      where: { id: loanId },
      data: { status }
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'UPDATE_LOAN_STATUS',
          target: loan.transactionRef,
          metadata: `New Status: ${status}`
        }
      });
    } catch { /* audit log error ignored */ }

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
    try {
      let items = await this.prisma.eligibilityBracket.findMany({
        orderBy: { minSalary: 'asc' }
      });
      if (!items || items.length === 0) {
        try {
          await this.prisma.eligibilityBracket.createMany({
            data: [
              { name: 'Jijenge Starter', minSalary: 0, maxSalary: 10000, assignedPackageName: 'Jijenge Starter', maxLimit: 3000, processingFee: 150, active: true },
              { name: 'Jijenge Boost', minSalary: 10001, maxSalary: 50000, assignedPackageName: 'Jijenge Boost', maxLimit: 15000, processingFee: 450, active: true },
              { name: 'Jijenge Executive', minSalary: 50001, maxSalary: 250000, assignedPackageName: 'Jijenge Executive', maxLimit: 50000, processingFee: 950, active: true }
            ]
          });
          items = await this.prisma.eligibilityBracket.findMany({
            orderBy: { minSalary: 'asc' }
          });
        } catch { /* ignored auto-seed fallback */ }
      }
      return { success: true, items: items || [] };
    } catch (err: any) {
      this.logger.error(`Failed to fetch eligibility brackets: ${err?.message}`, err?.stack);
      return { success: true, items: [] };
    }
  }

  async createEligibilityBracket(
    body: { name: string; minSalary: number; maxSalary: number; assignedPackageName: string; maxLimit: number; processingFee?: number },
    adminEmail: string
  ) {
    try {
      const cleanName = String(body.name || 'Jijenge Package').trim();
      const minSal = isNaN(Number(body.minSalary)) ? 0 : Number(body.minSalary);
      const maxSal = isNaN(Number(body.maxSalary)) ? 0 : Number(body.maxSalary);
      const pkgName = String(body.assignedPackageName || cleanName).trim();
      const maxLim = isNaN(Number(body.maxLimit)) ? 0 : Number(body.maxLimit);
      const procFee = body.processingFee !== undefined && !isNaN(Number(body.processingFee)) ? Number(body.processingFee) : 450;

      const bracket = await this.prisma.eligibilityBracket.create({
        data: {
          name: cleanName,
          minSalary: minSal,
          maxSalary: maxSal,
          assignedPackageName: pkgName,
          maxLimit: maxLim,
          processingFee: procFee,
          active: true
        }
      });

      const safeAdminEmail = String(adminEmail || 'admin@jijengeloans.co.ke');
      try {
        await this.prisma.auditLog.create({
          data: {
            adminEmail: safeAdminEmail,
            action: 'CREATE_ELIGIBILITY_BRACKET',
            target: cleanName,
            metadata: `Max Limit: ${maxLim}, Processing Fee: ${procFee}`
          }
        });
      } catch (auditErr: any) {
        this.logger.warn(`AuditLog creation skipped: ${auditErr?.message || auditErr}`);
      }

      return { success: true, bracket };
    } catch (err: any) {
      this.logger.error(`Failed to create eligibility bracket: ${err?.message}`, err?.stack);
      throw new BadRequestException(err?.message || 'Failed to create eligibility bracket');
    }
  }

  async updateEligibilityBracket(
    id: number,
    body: { name?: string; minSalary?: number; maxSalary?: number; assignedPackageName?: string; maxLimit?: number; processingFee?: number; active?: boolean },
    adminEmail: string
  ) {
    try {
      const bracketId = Number(id);
      if (isNaN(bracketId)) {
        throw new BadRequestException('Invalid bracket ID');
      }

      const dataToUpdate: any = {};
      if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
      if (body.minSalary !== undefined) dataToUpdate.minSalary = Number(body.minSalary);
      if (body.maxSalary !== undefined) dataToUpdate.maxSalary = Number(body.maxSalary);
      if (body.assignedPackageName !== undefined) dataToUpdate.assignedPackageName = String(body.assignedPackageName).trim();
      if (body.maxLimit !== undefined) dataToUpdate.maxLimit = Number(body.maxLimit);
      if (body.processingFee !== undefined) dataToUpdate.processingFee = Number(body.processingFee);
      if (body.active !== undefined) dataToUpdate.active = Boolean(body.active);

      const bracket = await this.prisma.eligibilityBracket.update({
        where: { id: bracketId },
        data: dataToUpdate
      });

      const safeAdminEmail = String(adminEmail || 'admin@jijengeloans.co.ke');
      try {
        await this.prisma.auditLog.create({
          data: {
            adminEmail: safeAdminEmail,
            action: 'UPDATE_ELIGIBILITY_BRACKET',
            target: String(bracketId),
            metadata: JSON.stringify(body)
          }
        });
      } catch (auditErr: any) {
        this.logger.warn(`AuditLog update skipped: ${auditErr?.message || auditErr}`);
      }

      return { success: true, bracket };
    } catch (err: any) {
      this.logger.error(`Failed to update eligibility bracket: ${err?.message}`, err?.stack);
      throw new BadRequestException(err?.message || 'Failed to update eligibility bracket');
    }
  }

  async deleteEligibilityBracket(id: number, adminEmail: string) {
    try {
      const bracketId = Number(id);
      if (isNaN(bracketId)) {
        throw new BadRequestException('Invalid bracket ID');
      }

      const bracket = await this.prisma.eligibilityBracket.delete({
        where: { id: bracketId }
      });

      const safeAdminEmail = String(adminEmail || 'admin@jijengeloans.co.ke');
      try {
        await this.prisma.auditLog.create({
          data: {
            adminEmail: safeAdminEmail,
            action: 'DELETE_ELIGIBILITY_BRACKET',
            target: String(bracketId)
          }
        });
      } catch (auditErr: any) {
        this.logger.warn(`AuditLog delete skipped: ${auditErr?.message || auditErr}`);
      }

      return { success: true, bracket };
    } catch (err: any) {
      this.logger.error(`Failed to delete eligibility bracket: ${err?.message}`, err?.stack);
      throw new BadRequestException(err?.message || 'Failed to delete eligibility bracket');
    }
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

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'SEND_MANUAL_SMS',
          target: phone,
          metadata: message.substring(0, 100)
        }
      });
    } catch { /* audit log error ignored */ }

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

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'UPSERT_SMS_TEMPLATE',
          target: body.key
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, template };
  }

  async resolveSupportTicket(id: string, status: string, adminEmail: string) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: { status }
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'RESOLVE_SUPPORT_TICKET',
          target: id,
          metadata: `New Status: ${status}`
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, ticket };
  }
}
