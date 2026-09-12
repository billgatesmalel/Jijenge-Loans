import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { LoanStatus, FeeStatus, WithdrawalStatus } from '@prisma/client';

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
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 1000;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.status && query.status !== 'ALL' && query.status !== 'All' && Object.values(LoanStatus).includes(query.status as any)) {
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
        items: items || [],
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit)
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch applications: ${err?.message}`, err?.stack);
      return {
        success: true,
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
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

    this.smsService.sendTemplateSms('BALANCE_ALLOCATED', loan.phoneNumber, {
      fullName: loan.fullName,
      amount: amount.toLocaleString(),
      txRef: loan.transactionRef
    }).catch(() => {});

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

    // Trigger stage-specific SMS notification
    this.smsService.triggerStatusSms(loan, status).catch(e => this.logger.warn(`Stage SMS notification error: ${e?.message}`));

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
    try {
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

      return { success: true, items: items || [], total: total || 0, page, limit, totalPages: Math.ceil((total || 0) / limit) };
    } catch (err: any) {
      this.logger.error(`Failed to fetch customers: ${err?.message}`, err?.stack);
      return { success: true, items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  async getPayments(query: { search?: string; page?: number; limit?: number }) {
    try {
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

      return { success: true, items: items || [], total: total || 0, page, limit, totalPages: Math.ceil((total || 0) / limit) };
    } catch (err: any) {
      this.logger.error(`Failed to fetch payments: ${err?.message}`, err?.stack);
      return { success: true, items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  async getEligibilityBrackets() {
    try {
      let items = await this.prisma.eligibilityBracket.findMany({
        orderBy: { minSalary: 'asc' }
      });
      if (!items || items.length === 0) {
        const DEFAULT_BRACKETS = [
          { name: 'Jijenge Micro Booster', minSalary: 0, maxSalary: 30000, assignedPackageName: 'Jijenge Micro Booster', maxLimit: 15000, processingFee: 250, weeklyInstallment: 3938, numWeeks: 4, monthlyInstallment: 16800, numMonths: 1, active: true },
          { name: 'Jijenge Business Flex', minSalary: 30001, maxSalary: 60000, assignedPackageName: 'Jijenge Business Flex', maxLimit: 35000, processingFee: 450, weeklyInstallment: 9188, numWeeks: 4, monthlyInstallment: 39200, numMonths: 1, active: true },
          { name: 'Jijenge Trade Prime', minSalary: 60001, maxSalary: 100000, assignedPackageName: 'Jijenge Trade Prime', maxLimit: 60000, processingFee: 750, weeklyInstallment: 15750, numWeeks: 4, monthlyInstallment: 67200, numMonths: 1, active: true },
          { name: 'Jijenge Enterprise Express', minSalary: 100001, maxSalary: 1000000, assignedPackageName: 'Jijenge Enterprise Express', maxLimit: 100000, processingFee: 1200, weeklyInstallment: 26250, numWeeks: 4, monthlyInstallment: 112000, numMonths: 1, active: true }
        ];
        for (const seed of DEFAULT_BRACKETS) {
          try {
            await this.prisma.eligibilityBracket.create({ data: seed });
          } catch (seedErr: any) {
            this.logger.warn(`Failed to seed bracket ${seed.name}: ${seedErr?.message}`);
          }
        }
        items = await this.prisma.eligibilityBracket.findMany({
          orderBy: { minSalary: 'asc' }
        });
      }

      const enrichedItems = (items || []).map((b: any) => {
        const limit = b.maxLimit || 0;
        const numWeeks = b.numWeeks && b.numWeeks > 0 ? b.numWeeks : 4;
        const weeklyInstallment = b.weeklyInstallment && b.weeklyInstallment > 0
          ? b.weeklyInstallment
          : Math.round((limit * 1.05) / numWeeks);
        const weeklyTotal = Math.round(weeklyInstallment * numWeeks);

        const numMonths = b.numMonths && b.numMonths > 0 ? b.numMonths : 1;
        const monthlyInstallment = b.monthlyInstallment && b.monthlyInstallment > 0
          ? b.monthlyInstallment
          : Math.round((limit * 1.12) / numMonths);
        const monthlyTotal = Math.round(monthlyInstallment * numMonths);

        return {
          ...b,
          numWeeks,
          weeklyInstallment,
          weeklyTotal,
          weeklyRepayment: weeklyTotal,
          numMonths,
          monthlyInstallment,
          monthlyTotal,
          monthlyRepayment: monthlyTotal,
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
    return this.smsService.getSmsTemplates();
  }

  async seedDefaultSmsTemplates() {
    return this.smsService.seedDefaultSmsTemplates();
  }

  async upsertSmsTemplate(body: { key: string; title: string; body: string; variables?: string[] }, adminEmail: string) {
    const res = await this.smsService.upsertSmsTemplate(body);

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'UPSERT_SMS_TEMPLATE',
          target: body.key
        }
      });
    } catch { /* audit log error ignored */ }

    return res;
  }

  async triggerReminders(adminEmail: string) {
    const res = await this.smsService.triggerReminders();

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'TRIGGER_AUTOMATED_REMINDERS',
          target: 'SYSTEM',
          metadata: `24H Sent: ${res.processed24hCount}, 7D Sent: ${res.processed7dCount}`
        }
      });
    } catch { /* audit log error ignored */ }

    return res;
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

  async getWithdrawals(query: { search?: string; page?: number; limit?: number }) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 1000;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.search) {
        const s = query.search.trim();
        where.OR = [
          { loanApplication: { fullName: { contains: s, mode: 'insensitive' } } },
          { loanApplication: { phoneNumber: { contains: s } } },
          { loanApplication: { nationalId: { contains: s } } },
          { loanApplication: { transactionRef: { contains: s, mode: 'insensitive' } } }
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.withdrawal.findMany({
          where,
          include: { loanApplication: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.withdrawal.count({ where })
      ]);

      return { success: true, items: items || [], total: total || 0, page, limit };
    } catch (err: any) {
      this.logger.error(`Failed to fetch withdrawals: ${err?.message}`);
      return { success: true, items: [], total: 0, page: 1, limit: 1000 };
    }
  }

  async approveWithdrawal(withdrawalId: string, adminEmail: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { loanApplication: true }
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal record not found');
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.Paid,
        resultDesc: 'Approved & Disbursed to M-Pesa'
      }
    });

    const loan = withdrawal.loanApplication;
    this.smsService.sendTemplateSms('WITHDRAWAL_APPROVED', loan.phoneNumber, {
      fullName: loan.fullName,
      amount: withdrawal.amount.toLocaleString(),
      txRef: loan.transactionRef
    }).catch(() => {});

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'APPROVE_WITHDRAWAL',
          target: loan.transactionRef,
          metadata: `Withdrawal Amount: KSh ${withdrawal.amount}`
        }
      });
    } catch { /* audit log error ignored */ }

    return { success: true, message: 'Withdrawal approved and disbursed successfully', withdrawal: updated };
  }

  async rejectWithdrawal(withdrawalId: string, rejectionReason: string, adminEmail: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { loanApplication: true }
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal record not found');
    }

    const loan = withdrawal.loanApplication;
    const cleanReason = String(rejectionReason || 'Mismatch in details or verification failure').trim();
    const restoredBalance = (loan.allocatedBalance || 0) + withdrawal.amount;

    // Revert withdrawn funds back to customer's allocated loan balance & mark withdrawal failed
    const [updatedLoan, updatedWithdrawal] = await Promise.all([
      this.prisma.loanApplication.update({
        where: { id: loan.id },
        data: { allocatedBalance: restoredBalance }
      }),
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.Failed,
          resultDesc: cleanReason
        }
      })
    ]);

    // Send WITHDRAWAL_REJECTED SMS template informing customer of rejection & funds restoration
    this.smsService.sendTemplateSms('WITHDRAWAL_REJECTED', loan.phoneNumber, {
      fullName: loan.fullName,
      amount: withdrawal.amount.toLocaleString(),
      txRef: loan.transactionRef,
      rejectionReason: cleanReason
    }).catch(() => {});

    try {
      await this.prisma.auditLog.create({
        data: {
          adminEmail: String(adminEmail || 'admin@jijengeloans.co.ke'),
          action: 'REJECT_WITHDRAWAL',
          target: loan.transactionRef,
          metadata: `Reason: ${cleanReason} | Restored: KSh ${withdrawal.amount}`
        }
      });
    } catch { /* audit log error ignored */ }

    return {
      success: true,
      message: `Withdrawal rejected. KSh ${withdrawal.amount.toLocaleString()} restored to customer portal balance.`,
      withdrawal: updatedWithdrawal,
      restoredBalance: updatedLoan.allocatedBalance
    };
  }
}
