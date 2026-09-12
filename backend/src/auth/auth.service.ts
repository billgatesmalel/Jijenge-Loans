import { Injectable, UnauthorizedException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService
  ) {}

  async onModuleInit() {
    await this.ensureSuperAdminExists();
  }

  async ensureSuperAdminExists() {
    try {
      const adminEmail = (process.env.SUPER_ADMIN_USER || 'admin@jijengeloans.co.ke').trim().toLowerCase();
      const adminPass = process.env.SUPER_ADMIN_PASS || 'Jijenge2026!SecureAdminPass';
      const passwordHash = await argon2.hash(adminPass);

      const existingAdmin = await this.prisma.admin.findUnique({
        where: { email: adminEmail }
      });

      if (!existingAdmin) {
        await this.prisma.admin.create({
          data: {
            email: adminEmail,
            passwordHash,
            role: Role.SUPER_ADMIN,
            fullName: 'Jijenge Super Administrator',
            active: true
          }
        });
        this.logger.log(`✅ [AUTO-SEED] Super Admin created for: ${adminEmail}`);
      } else if (!existingAdmin.active) {
        await this.prisma.admin.update({
          where: { id: existingAdmin.id },
          data: { active: true, passwordHash }
        });
        this.logger.log(`✅ [AUTO-SEED] Super Admin account re-activated for: ${adminEmail}`);
      }
    } catch (err: any) {
      this.logger.error(`⚠️ Super Admin auto-provisioning check: ${err.message}`);
    }
  }

  async adminLogin(email: string, pass: string) {
    const cleanEmail = email.trim().toLowerCase();
    let admin = await this.prisma.admin.findUnique({ where: { email: cleanEmail } });

    // Auto-heal if database was cleared or seeded freshly
    if (!admin) {
      await this.ensureSuperAdminExists();
      admin = await this.prisma.admin.findUnique({ where: { email: cleanEmail } });
    }

    if (!admin) {
      throw new UnauthorizedException('Invalid admin credentials or account disabled');
    }

    if (!admin.active) {
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { active: true }
      });
      admin.active = true;
    }

    const isValid = await argon2.verify(admin.passwordHash, pass);
    if (!isValid) {
      // Fallback check against process.env.SUPER_ADMIN_PASS in case env was updated live
      const envPass = process.env.SUPER_ADMIN_PASS || 'Jijenge2026!SecureAdminPass';
      const envUser = (process.env.SUPER_ADMIN_USER || 'admin@jijengeloans.co.ke').trim().toLowerCase();
      if (cleanEmail === envUser && pass === envPass) {
        const newHash = await argon2.hash(envPass);
        await this.prisma.admin.update({
          where: { id: admin.id },
          data: { passwordHash: newHash, active: true }
        });
      } else {
        throw new UnauthorizedException('Invalid admin credentials');
      }
    }

    const payload = { sub: admin.id, email: admin.email, role: admin.role, type: 'ADMIN' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        adminId: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role }
    };
  }

  async customerLogin(phone: string, pin: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: '0' + cleanPhone.replace(/^254/, '') },
          { phoneNumber: cleanPhone.replace(/^0/, '254') }
        ]
      }
    });

    if (!user) {
      throw new UnauthorizedException('Authentication failed. Please verify your phone and PIN.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account locked due to multiple failed login attempts. Try again later.');
    }

    if (!user.pinHash) {
      const pinHash = await argon2.hash(pin);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pinHash, failedLoginAttempts: 0, lockedUntil: null }
      });
    } else {
      const isValidPin = await argon2.verify(user.pinHash, pin);
      if (!isValidPin) {
        const attempts = user.failedLoginAttempts + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: attempts, lockedUntil: lockUntil }
        });
        throw new UnauthorizedException('Authentication failed. Please verify your phone and PIN.');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    const userRole = (user as any).role || Role.CUSTOMER;
    const payload = { sub: user.id, phone: user.phoneNumber, role: userRole, type: 'CUSTOMER' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      role: userRole,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        nationalId: user.nationalId
      }
    };
  }

  async resendCustomerPin(phone: string) {
    if (!phone) {
      throw new BadRequestException('Phone number is required.');
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: '0' + cleanPhone.replace(/^254/, '') },
          { phoneNumber: cleanPhone.replace(/^0/, '254') }
        ]
      }
    });

    if (!user) {
      // Return a generic success to avoid enumeration
      return { success: true };
    }

    // Cooldown verification (60 seconds)
    const clean = user.phoneNumber.replace(/\D/g, '');
    const formattedRecipient = clean.startsWith('0')
      ? '+254' + clean.slice(1)
      : (clean.startsWith('254') ? '+' + clean : '+' + clean);

    const lastSms = await this.prisma.smsLog.findFirst({
      where: {
        recipientPhone: formattedRecipient,
        message: { contains: 'security PIN' }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lastSms && (Date.now() - lastSms.createdAt.getTime()) < 60000) {
      throw new BadRequestException('Please wait 60 seconds before requesting another PIN resend.');
    }

    // Generate PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await argon2.hash(pin);

    // Send SMS first
    const message = `Your Jijenge Loans security PIN has been reset to: ${pin}. Use this PIN to log in.`;
    const smsResult = await this.smsService.sendSms(user.phoneNumber, message);

    if (!smsResult.success) {
      // Log failure internally but hide details from customer
      this.logger.error(`❌ [PIN RESET SMS FAILED] Recipient: ${user.phoneNumber} | Error: ${smsResult.error || 'Unknown error'}`);
      throw new BadRequestException("We couldn't send the PIN right now. Please try again later.");
    }

    // Update database now that SMS has successfully delivered
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        pinHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    return { success: true };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const stored = await this.prisma.refreshToken.findUnique({ where: { token } });

      if (!stored || stored.revoked || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token revoked or expired');
      }

      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true }
      });

      const newPayload = { sub: payload.sub, email: payload.email, phone: payload.phone, role: payload.role, type: payload.type };
      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      await this.prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          adminId: stored.adminId,
          userId: stored.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
