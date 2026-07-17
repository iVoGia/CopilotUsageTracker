import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardFiltersSchema } from '@ghc/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/roles.guard';
import { CreditsService } from './credits.service';

@ApiTags('credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  usage(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.credits.usage(user, DashboardFiltersSchema.parse(query));
  }

  @Get('rates')
  rates() {
    return this.credits.listRates();
  }
}
