import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchemaUpToDate();
  }

  async ensureSchemaUpToDate() {
    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE "EligibilityBracket" ADD COLUMN IF NOT EXISTS "processingFee" DOUBLE PRECISION NOT NULL DEFAULT 450;
        ALTER TABLE "EligibilityBracket" ADD COLUMN IF NOT EXISTS "weeklyInstallment" DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE "EligibilityBracket" ADD COLUMN IF NOT EXISTS "numWeeks" INTEGER DEFAULT 4;
        ALTER TABLE "EligibilityBracket" ADD COLUMN IF NOT EXISTS "monthlyInstallment" DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE "EligibilityBracket" ADD COLUMN IF NOT EXISTS "numMonths" INTEGER DEFAULT 1;

        ALTER TABLE "LoanApplication" ADD COLUMN IF NOT EXISTS "repaymentFrequency" TEXT DEFAULT 'Weekly';
        ALTER TABLE "LoanApplication" ADD COLUMN IF NOT EXISTS "repaymentAmount" DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE "LoanApplication" ADD COLUMN IF NOT EXISTS "installmentAmount" DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE "LoanApplication" ADD COLUMN IF NOT EXISTS "numInstallments" INTEGER DEFAULT 4;
      `);
    } catch (e) {
      console.warn('PrismaService schema sync (new repayment columns):', (e as any)?.message || e);
    }

    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AuditLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "adminEmail" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "target" TEXT,
          "metadata" TEXT,
          "ipAddress" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {
      console.warn('PrismaService schema sync (AuditLog table):', (e as any)?.message || e);
    }

    try {
      await this.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"EligibilityBracket"', 'id'),
          COALESCE((SELECT MAX(id) FROM "EligibilityBracket"), 0) + 1,
          false
        );
      `);
    } catch (e) {
      console.warn('PrismaService sequence sync (EligibilityBracket_id_seq):', (e as any)?.message || e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
