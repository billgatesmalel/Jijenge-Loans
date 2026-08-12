import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Admin Portal Login' })
  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; pass: string }) {
    return this.authService.adminLogin(body.email, body.pass);
  }

  @ApiOperation({ summary: 'Customer Portal Login' })
  @HttpCode(HttpStatus.OK)
  @Post('customer/login')
  async customerLogin(@Body() body: { phone: string; pin: string }) {
    return this.authService.customerLogin(body.phone, body.pin);
  }

  @ApiOperation({ summary: 'Resend Customer Security PIN' })
  @HttpCode(HttpStatus.OK)
  @Post('customer/resend-pin')
  async resendPin(@Body() body: { phone: string }) {
    return this.authService.resendCustomerPin(body.phone);
  }

  @ApiOperation({ summary: 'Refresh JWT Access Token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }
}
