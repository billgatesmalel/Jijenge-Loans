import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async adminLogin(email: string, pass: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.active) {
      throw new UnauthorizedException('Invalid admin credentials or account disabled');
    }

    const isValid = await argon2.verify(admin.passwordHash, pass);
    if (!isValid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload = { sub: admin.id, email: admin.email, role: admin.role, type: 'ADMIN' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
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
      throw new UnauthorizedException('Customer record not found. Please submit a loan application first.');
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
        throw new UnauthorizedException('Invalid PIN code');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    const payload = { sub: user.id, phone: user.phoneNumber, role: user.role, type: 'CUSTOMER' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
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
      role: user.role,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        nationalId: user.nationalId
      }
    };
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
      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: payload.type === 'ADMIN' ? '15m' : '1h' });
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
