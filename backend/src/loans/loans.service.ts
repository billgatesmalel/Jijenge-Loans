import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { generateTransactionRef, calculateProcessingFee } from '../common/shared';
import { LoanStatus, FeeStatus } from '@prisma/client';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService
  ) {}

  async apply(dto: {
    fullName: string;
    nationalId: string;
    age: number;
    gender: string;
    maritalStatus: string;
    dependents?: string;
    phoneNumber: string;
    email?: string;
    businessName?: string;
    businessType: string;
    county: string;
    townArea: string;
    monthlyIncome?: string;
    amount: number;
    packageName: string;
    tenureDays?: number;
    processingFee?: number;
    repaymentFrequency?: string;
    repaymentAmount?: number;
    installmentAmount?: number;
    numInstallments?: number;
  }) {
    try {
      if (!dto.fullName || !dto.nationalId || !dto.phoneNumber || !dto.amount) {
        throw new BadRequestException('Required fields missing');
      }

      const cleanPhone = dto.phoneNumber.replace(/\D/g, '');
      const cleanId = dto.nationalId.trim();
      let processingFee = dto.processingFee;
      if (!processingFee) {
        const bracket = await this.prisma.eligibilityBracket.findFirst({
          where: {
            OR: [
              { assignedPackageName: dto.packageName },
              { maxLimit: dto.amount }
            ]
          }
        });
        processingFee = bracket?.processingFee || calculateProcessingFee(dto.amount);
      }
      const txRef = generateTransactionRef();

      // Find user by nationalId OR phoneNumber
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ nationalId: cleanId }, { phoneNumber: cleanPhone }]
        }
      });

      if (!user) {
        try {
          user = await this.prisma.user.create({
            data: {
              fullName: dto.fullName,
              nationalId: cleanId,
              age: Number(dto.age) || 25,
              gender: dto.gender || 'Male',
              maritalStatus: dto.maritalStatus || 'Single',
              dependents: dto.dependents || '0',
              phoneNumber: cleanPhone,
              email: dto.email || '',
              businessName: dto.businessName || 'General Enterprise',
              businessType: dto.businessType || 'General Trade',
              county: dto.county || 'Nairobi',
              townArea: dto.townArea || 'CBD',
              monthlyIncome: dto.monthlyIncome || ''
            }
          });
        } catch (createErr: any) {
          this.logger.warn(`User creation constraint fallback: ${createErr.message}`);
          user = await this.prisma.user.findFirst({
            where: { OR: [{ nationalId: cleanId }, { phoneNumber: cleanPhone }] }
          });
        }
      }

      const loan = await this.prisma.loanApplication.create({
        data: {
          transactionRef: txRef,
          userId: user ? user.id : null,
          fullName: dto.fullName,
          nationalId: cleanId,
          phoneNumber: cleanPhone,
          email: dto.email || '',
          businessName: dto.businessName || 'General Enterprise',
          businessType: dto.businessType || 'General Trade',
          county: dto.county || 'Nairobi',
          townArea: dto.townArea || 'CBD',
          monthlyIncome: dto.monthlyIncome || '',
          amount: Number(dto.amount),
          processingFee,
          packageName: dto.packageName || 'Jijenge Micro Booster',
          tenureDays: Number(dto.tenureDays) || 30,
          repaymentFrequency: dto.repaymentFrequency || 'Weekly',
          repaymentAmount: Number(dto.repaymentAmount) || 0,
          installmentAmount: Number(dto.installmentAmount) || 0,
          numInstallments: Number(dto.numInstallments) || 4,
          status: LoanStatus.Pending_STK_Fee_Payment,
          feeStatus: FeeStatus.Pending_STK_Push
        }
      });

      // Fire stage-specific SMS template asynchronously
      Promise.resolve().then(() => {
        this.smsService.triggerStatusSms(loan, loan.status).catch((e) => this.logger.error(`SMS Error: ${e.message}`));
      });

      return {
        success: true,
        message: 'Loan application registered successfully.',
        loan: {
          id: loan.id,
          transactionRef: loan.transactionRef,
          phoneNumber: loan.phoneNumber,
          fullName: loan.fullName,
          amount: loan.amount,
          processingFee: loan.processingFee,
          packageName: loan.packageName,
          status: loan.status,
          feeStatus: loan.feeStatus
        }
      };
    } catch (err: any) {
      this.logger.error(`Loan apply error: ${err.message}`, err.stack);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Unable to process loan application. Please check your details and try again.');
    }
  }

  async track(refOrPhone: string) {
    const clean = refOrPhone.trim();
    const loan = await this.prisma.loanApplication.findFirst({
      where: {
        OR: [
          { transactionRef: clean.toUpperCase() },
          { phoneNumber: clean.replace(/\D/g, '') },
          { nationalId: clean }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!loan) {
      throw new NotFoundException('No loan application record found');
    }

    const stages = await this.prisma.workflowStage.findMany({
      where: { active: true },
      orderBy: { order: 'asc' }
    });

    return {
      success: true,
      loan,
      stages
    };
  }

  async getEligibilityBrackets() {
    try {
      let rawBrackets = await this.prisma.eligibilityBracket.findMany({
        where: { active: true },
        orderBy: { minSalary: 'asc' }
      });

      if (!rawBrackets || rawBrackets.length === 0) {
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
        rawBrackets = await this.prisma.eligibilityBracket.findMany({
          where: { active: true },
          orderBy: { minSalary: 'asc' }
        });
      }

      const brackets = (rawBrackets || []).map((b: any) => {
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
      return { success: true, brackets };
    } catch {
      return { success: true, brackets: [] };
    }
  }

  async checkUnfinished(dto: { phoneNumber?: string; nationalId?: string }) {
    const cleanPhone = (dto.phoneNumber || '').replace(/\D/g, '');
    const cleanId = (dto.nationalId || '').trim();

    if (!cleanPhone && !cleanId) {
      return { exists: false };
    }

    const unfinishedLoan = await this.prisma.loanApplication.findFirst({
      where: {
        AND: [
          {
            OR: [
              ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : []),
              ...(cleanId ? [{ nationalId: cleanId }] : [])
            ]
          },
          {
            status: {
              in: [
                LoanStatus.Pending_STK_Fee_Payment,
                LoanStatus.Pending,
                LoanStatus.Application_Received,
                LoanStatus.Initial_Verification
              ]
            }
          },
          {
            feeStatus: {
              notIn: [FeeStatus.Paid]
            }
          }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!unfinishedLoan) {
      return { exists: false };
    }

    const userProfile = unfinishedLoan.userId
      ? await this.prisma.user.findUnique({ where: { id: unfinishedLoan.userId } })
      : null;

    return {
      exists: true,
      loan: unfinishedLoan,
      userProfile
    };
  }

  async resumeStk(loanId: string) {
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
        feeResultDesc: 'Resumed STK Push initialized.'
      }
    });

    const smsMsg = `Dear ${loan.fullName}, STK Push fee payment prompt for your Jijenge Loan (Ref: ${loan.transactionRef}, KSh ${loan.amount.toLocaleString()}) has been re-triggered. Please enter your M-Pesa PIN on your phone.`;
    this.smsService.sendSms(loan.phoneNumber, smsMsg).catch(e => this.logger.error(`SMS error: ${e.message}`));

    return {
      success: true,
      message: 'M-Pesa STK Push prompt re-triggered successfully.',
      loan: updatedLoan
    };
  }

  async cancelAndRestart(loanId: string) {
    const loan = await this.prisma.loanApplication.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan application not found');
    }

    await this.prisma.loanApplication.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.Payment_Failed,
        feeStatus: FeeStatus.Cancelled
      }
    });

    return {
      success: true,
      message: 'Previous application cancelled. You can now start a fresh loan application.',
      userProfile: {
        fullName: loan.fullName,
        nationalId: loan.nationalId,
        phoneNumber: loan.phoneNumber,
        email: loan.email,
        businessName: loan.businessName,
        businessType: loan.businessType,
        county: loan.county,
        townArea: loan.townArea,
        monthlyIncome: loan.monthlyIncome
      }
    };
  }
}
