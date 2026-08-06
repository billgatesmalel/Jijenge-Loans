import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';

@ApiTags('Loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @ApiOperation({ summary: 'Submit New Loan Application' })
  @Post('apply')
  async apply(@Body() body: any) {
    return this.loansService.apply(body);
  }

  @ApiOperation({ summary: 'Track Application Status by Reference, Phone or National ID' })
  @Get('track/:query')
  async track(@Param('query') query: string) {
    return this.loansService.track(query);
  }

  @ApiOperation({ summary: 'Get Configurable Salary Eligibility Brackets' })
  @Get('eligibility')
  async getEligibilityBrackets() {
    return this.loansService.getEligibilityBrackets();
  }
}
