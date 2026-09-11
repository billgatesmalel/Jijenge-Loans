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
          status: LoanStatus.Pending_STK_Fee_Payment,
          feeStatus: FeeStatus.Pending_STK_Push
        }
      });

      // Fire SMS asynchronously without blocking the response
      const smsMsg = `Dear ${dto.fullName}, your Jijenge Loan application (Ref: ${txRef}) for KSh ${dto.amount.toLocaleString()} has been received. Proceed to complete STK fee payment.`;
      Promise.resolve().then(() => {
        this.smsService.sendSms(cleanPhone, smsMsg).catch((e) => this.logger.error(`SMS Error: ${e.message}`));
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
    const brackets = await this.prisma.eligibilityBracket.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    });
    return { success: true, brackets };
  }
}
