import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Jijenge Loans Backend Database Seed...');

  // ── Super Admin (Admin table) ──────────────────────────────────────────────
  const adminEmail = process.env.SUPER_ADMIN_USER || 'admin@jijengeloans.co.ke';
  const adminPass = process.env.SUPER_ADMIN_PASS || 'Jijenge2026!SecureAdminPass';
  const passwordHash = await argon2.hash(adminPass);

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.SUPER_ADMIN,
        fullName: 'Jijenge Super Administrator',
        active: true
      }
    });
    console.log(`✅ Super Admin created: ${adminEmail}`);
  }

  // ── Admin User (User table — unified customer login) ───────────────────────
  // This account authenticates via the customer login endpoint and receives
  // an ADMIN-role JWT, enabling the Admin Switch feature in the customer dashboard.
  const ADMIN_PHONE = '0799289214';
  const ADMIN_PIN   = '258003180Kibet.'; // Full PIN including trailing full stop

  const existingAdminUser = await prisma.user.findFirst({
    where: { phoneNumber: ADMIN_PHONE }
  });

  if (!existingAdminUser) {
    const pinHash = await argon2.hash(ADMIN_PIN);
    await prisma.user.create({
      data: {
        fullName:      'Jijenge Administrator',
        nationalId:    'ADMIN-000000001',
        age:           30,
        gender:        'Other',
        maritalStatus: 'Single',
        dependents:    '0',
        phoneNumber:   ADMIN_PHONE,
        businessName:  'Jijenge Loans Kenya Ltd',
        businessType:  'Financial Services',
        county:        'Nairobi',
        townArea:      'CBD',
        role:          Role.ADMIN,
        pinHash,
        failedLoginAttempts: 0
      }
    });
    console.log(`✅ Admin User created: phone=${ADMIN_PHONE}`);
  } else if (existingAdminUser.role !== Role.ADMIN) {
    // Ensure the role is correct if the record already exists
    const pinHash = await argon2.hash(ADMIN_PIN);
    await prisma.user.update({
      where: { id: existingAdminUser.id },
      data: { role: Role.ADMIN, pinHash }
    });
    console.log(`✅ Admin User role updated: phone=${ADMIN_PHONE}`);
  } else {
    console.log(`ℹ️  Admin User already exists: phone=${ADMIN_PHONE}`);
  }

  // ── Eligibility Brackets ───────────────────────────────────────────────────
  const salaryBrackets = [
    { id: 1, name: 'Entry Tier (KSh 15,000 - 30,000)', minSalary: 15000, maxSalary: 30000, assignedPackageName: 'Jijenge Micro Booster', maxLimit: 15000, active: true },
    { id: 2, name: 'Standard Tier (KSh 30,001 - 60,000)', minSalary: 30001, maxSalary: 60000, assignedPackageName: 'Jijenge Business Flex', maxLimit: 35000, active: true },
    { id: 3, name: 'Growth Tier (KSh 60,001 - 100,000)', minSalary: 60001, maxSalary: 100000, assignedPackageName: 'Jijenge Trade Prime', maxLimit: 60000, active: true },
    { id: 4, name: 'Enterprise Tier (KSh 100,000+)', minSalary: 100001, maxSalary: 1000000, assignedPackageName: 'Jijenge Enterprise Express', maxLimit: 120000, active: true }
  ];

  for (const bracket of salaryBrackets) {
    await prisma.eligibilityBracket.upsert({
      where: { id: bracket.id },
      update: bracket,
      create: bracket
    });
  }

  // ── Workflow Stages ────────────────────────────────────────────────────────
  const workflowStages = [
    { id: 1, stageKey: 'Application_Received', text: 'Application Received & Queued', order: 1, active: true },
    { id: 2, stageKey: 'Initial_Verification', text: 'Initial ID & Contact Verification', order: 2, active: true },
    { id: 3, stageKey: 'Credit_Assessment', text: 'Creditworthiness & Revenue Assessment', order: 3, active: true },
    { id: 4, stageKey: 'Loan_Review', text: 'Senior Credit Officer Final Approval', order: 4, active: true },
    { id: 5, stageKey: 'Disbursement_In_Progress', text: 'M-Pesa Disbursal Processing', order: 5, active: true }
  ];

  for (const stage of workflowStages) {
    await prisma.workflowStage.upsert({
      where: { stageKey: stage.stageKey },
      update: stage,
      create: stage
    });
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

