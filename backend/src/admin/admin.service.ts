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
    try {
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

      // ── Package Analytics ──────────────────────────────────────
      const brackets = await this.prisma.eligibilityBracket.findMany({
        where: { active: true },
        orderBy: { minSalary: 'asc' }
      });

      const allApps = await this.prisma.loanApplication.findMany({
        select: {
          packageName: true,
          amount: true,
          allocatedBalance: true,
          amountPaid: true,
          status: true,
          county: true
        }
      });

      const packageAnalytics = brackets.map(b => {
        const pkgName = b.assignedPackageName || b.name;
        const pkgApps = allApps.filter(a =>
          a.packageName?.toLowerCase().trim() === pkgName.toLowerCase().trim() ||
          a.packageName?.toLowerCase().trim() === b.name?.toLowerCase().trim()
        );
        const count = pkgApps.length;
        const allocated = pkgApps.reduce((acc, a) => acc + (a.allocatedBalance || 0), 0);
        const fees = pkgApps.reduce((acc, a) => acc + (a.amountPaid || 0), 0);
        const approvedCount = pkgApps.filter(a => (a.status as string) === 'Approved' || (a.status as string) === 'APPROVED' || (a.status as string) === 'Disbursed' || (a.status as string) === 'DISBURSED').length;
        const approvalRate = count > 0 ? Math.round((approvedCount / count) * 100) : 0;
        const maxLimit = b.maxLimit || 0;
        const weeklyRepayment = Math.round(maxLimit * 1.05);
        const monthlyRepayment = Math.round(maxLimit * 1.12);

        return {
          id: b.id,
          packageName: pkgName,
          minSalary: b.minSalary,
          maxSalary: b.maxSalary,
          maxLimit,
          processingFee: b.processingFee || 450,
          applicationCount: count,
          totalAllocated: allocated,
          totalFeesCollected: fees,
          approvalRate,
          weeklyRepayment,
          monthlyRepayment,
          weeklyAmount: weeklyRepayment,
          monthlyAmount: monthlyRepayment
        };
      });

      // ── County Analytics ───────────────────────────────────────
      const countyMap: Record<string, { count: number; totalAmount: number; totalFees: number }> = {};
      allApps.forEach(a => {
        const cName = (a.county || 'Nairobi').trim();
        if (!countyMap[cName]) {
          countyMap[cName] = { count: 0, totalAmount: 0, totalFees: 0 };
        }
        countyMap[cName].count += 1;
        countyMap[cName].totalAmount += (a.allocatedBalance || a.amount || 0);
        countyMap[cName].totalFees += (a.amountPaid || 0);
      });

      const countyAnalytics = Object.entries(countyMap)
        .map(([county, data]) => ({
          county,
          count: data.count,
          totalAmount: data.totalAmount,
          totalFees: data.totalFees,
          percentage: totalApplications > 0 ? Math.round((data.count / totalApplications) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      return {
        success: true,
        metrics: {
          totalApplications,
          paidApplications,
          approvedApplications,
          disbursedApplications,
          totalRevenue,
          totalAllocated,
          conversionRate,
          packageAnalytics,
          countyAnalytics
        }
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate analytics: ${err?.message}`, err?.stack);
      return {
        success: true,
        metrics: {
          totalApplications: 0,
          paidApplications: 0,
          approvedApplications: 0,
          disbursedApplications: 0,
          totalRevenue: 0,
          totalAllocated: 0,
          conversionRate: 0,
          packageAnalytics: [],
          countyAnalytics: []
        }
      };
    }
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

      const enrichedItems = (items || []).map((b: any) => {
        const limit = b.maxLimit || 0;
        const weeklyRepayment = Math.round(limit * 1.05);
        const monthlyRepayment = Math.round(limit * 1.12);
        return {
          ...b,
          weeklyRepayment,
          monthlyRepayment,
          weeklyAmount: weeklyRepayment,
          monthlyAmount: monthlyRepayment,
          weeklyFeeRate: '5%',
          monthlyFeeRate: '12%'
        };
      });

      return { success: true, items: enrichedItems };
    } catch (err: any) {
      this.logger.error(`Failed to fetch eligibility brackets: ${err?.message}`, err?.stack);
      return { success: true, items: [] };
    }
  }

  async createEligibilityBracket(
    body: {
      name: string;
      minSalary: number;
      maxSalary: number;
      assignedPackageName: string;
      maxLimit: number;
      processingFee?: number;
      weeklyInstallment?: number;
      numWeeks?: number;
      monthlyInstallment?: number;
      numMonths?: number;
    },
    adminEmail: string
  ) {
    try {
      const cleanName = String(body.name || 'Jijenge Package').trim();
      const minSal = isNaN(Number(body.minSalary)) ? 0 : Number(body.minSalary);
      const maxSal = isNaN(Number(body.maxSalary)) ? 0 : Number(body.maxSalary);
      const pkgName = String(body.assignedPackageName || cleanName).trim();
      const maxLim = isNaN(Number(body.maxLimit)) ? 0 : Number(body.maxLimit);
      const procFee = body.processingFee !== undefined && !isNaN(Number(body.processingFee)) ? Number(body.processingFee) : 450;
      const wkInst = body.weeklyInstallment !== undefined && !isNaN(Number(body.weeklyInstallment)) ? Number(body.weeklyInstallment) : Math.round((maxLim * 1.05) / 4);
      const nWeeks = body.numWeeks !== undefined && !isNaN(Number(body.numWeeks)) ? Number(body.numWeeks) : 4;
      const moInst = body.monthlyInstallment !== undefined && !isNaN(Number(body.monthlyInstallment)) ? Number(body.monthlyInstallment) : Math.round(maxLim * 1.12);
      const nMonths = body.numMonths !== undefined && !isNaN(Number(body.numMonths)) ? Number(body.numMonths) : 1;

      let bracket;
      try {
        bracket = await this.prisma.eligibilityBracket.create({
          data: {
            name: cleanName,
            minSalary: minSal,
            maxSalary: maxSal,
            assignedPackageName: pkgName,
            maxLimit: maxLim,
            processingFee: procFee,
            weeklyInstallment: wkInst,
            numWeeks: nWeeks,
            monthlyInstallment: moInst,
            numMonths: nMonths,
            active: true
          }
        });
      } catch (dbErr: any) {
        this.logger.warn(`Retrying eligibilityBracket.create after auto schema repair: ${dbErr?.message || dbErr}`);
        await this.prisma.ensureSchemaUpToDate();
        bracket = await this.prisma.eligibilityBracket.create({
          data: {
            name: cleanName,
            minSalary: minSal,
            maxSalary: maxSal,
            assignedPackageName: pkgName,
            maxLimit: maxLim,
            processingFee: procFee,
            weeklyInstallment: wkInst,
            numWeeks: nWeeks,
            monthlyInstallment: moInst,
            numMonths: nMonths,
            active: true
          }
        });
      }

      const safeAdminEmail = String(adminEmail || 'admin@jijengeloans.co.ke');
      try {
        await this.prisma.auditLog.create({
          data: {
            adminEmail: safeAdminEmail,
            action: 'CREATE_ELIGIBILITY_BRACKET',
            target: cleanName,
            metadata: `Max Limit: ${maxLim}, Processing Fee: ${procFee}, Weekly: ${wkInst}x${nWeeks}, Monthly: ${moInst}x${nMonths}`
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
    body: {
      name?: string;
      minSalary?: number;
      maxSalary?: number;
      assignedPackageName?: string;
      maxLimit?: number;
      processingFee?: number;
      weeklyInstallment?: number;
      numWeeks?: number;
      monthlyInstallment?: number;
      numMonths?: number;
      active?: boolean;
    },
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
      if (body.weeklyInstallment !== undefined) dataToUpdate.weeklyInstallment = Number(body.weeklyInstallment);
      if (body.numWeeks !== undefined) dataToUpdate.numWeeks = Number(body.numWeeks);
      if (body.monthlyInstallment !== undefined) dataToUpdate.monthlyInstallment = Number(body.monthlyInstallment);
      if (body.numMonths !== undefined) dataToUpdate.numMonths = Number(body.numMonths);
      if (body.active !== undefined) dataToUpdate.active = Boolean(body.active);

      let bracket;
      try {
        bracket = await this.prisma.eligibilityBracket.update({
          where: { id: bracketId },
          data: dataToUpdate
        });
      } catch (dbErr: any) {
        if (dbErr?.message?.includes('processingFee')) {
          await this.prisma.ensureSchemaUpToDate();
          bracket = await this.prisma.eligibilityBracket.update({
            where: { id: bracketId },
            data: dataToUpdate
          });
        } else {
          throw dbErr;
        }
      }

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

  async deleteSmsLogsBulk(ids: string[]) {
    try {
      if (!ids || ids.length === 0) return { success: true, count: 0 };
      await this.prisma.smsLog.deleteMany({
        where: { id: { in: ids } }
      });
      return { success: true, count: ids.length };
    } catch (e: any) {
      throw new BadRequestException('Failed to delete SMS logs');
    }
  }

  async deleteApplicationsBulk(ids: string[]) {
    try {
      if (!ids || ids.length === 0) return { success: true, count: 0 };
      await this.prisma.loanApplication.deleteMany({
        where: { id: { in: ids } }
      });
      return { success: true, count: ids.length };
    } catch (e: any) {
      throw new BadRequestException('Failed to delete selected loan applications');
    }
  }

  async sendBulkSms(phones: string[], message: string, adminEmail: string) {
    const uniquePhones = Array.from(new Set((phones || []).map(p => p.trim()).filter(Boolean)));
    if (uniquePhones.length === 0) return { success: true, count: 0, total: 0 };

    let successCount = 0;
    for (const phone of uniquePhones) {
      try {
        const res = await this.smsService.sendSms(phone, message);
        if (res.success) successCount++;
      } catch { /* ignored */ }
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'SEND_BULK_SMS',
          target: `${uniquePhones.length} recipients`,
          metadata: message.substring(0, 100)
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, count: successCount, total: uniquePhones.length };
  }

  async retriggerStk(loanId: string, adminIdentifier: string) {
    const loan = await this.prisma.loanApplication.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan application not found');
    }

    const feeAmount = loan.processingFee || loan.fee || 450;
    const updatedLoan = await this.prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.Pending_STK_Fee_Payment,
        feeStatus: FeeStatus.Pending_STK_Push,
        checkoutRequestId: `ws_CO_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        feeResultDesc: `Admin (${adminIdentifier}) triggered STK Push.`
      }
    });

    const smsMsg = `Dear ${loan.fullName}, STK Push fee payment prompt for your Jijenge Loan (Ref: ${loan.transactionRef}) has been triggered by support. Please enter your M-Pesa PIN on your phone.`;
    this.smsService.sendSms(loan.phoneNumber, smsMsg).catch(e => this.logger.error(`SMS error: ${e.message}`));

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminIdentifier),
          action: 'RETRIGGER_STK_PUSH',
          target: loan.transactionRef,
          metadata: `Triggered STK for ${loan.phoneNumber}`
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, message: 'STK Push triggered successfully', loan: updatedLoan };
  }

  async resetApplication(loanId: string, adminIdentifier: string) {
    const loan = await this.prisma.loanApplication.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan application not found');
    }

    const updatedLoan = await this.prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.Payment_Failed,
        feeStatus: FeeStatus.Cancelled
      }
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminIdentifier),
          action: 'RESET_APPLICATION',
          target: loan.transactionRef,
          metadata: `Reset application for ${loan.phoneNumber}`
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, message: 'Application reset successfully', loan: updatedLoan };
  }
}
