import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardFiltersSchema } from '@ghc/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/roles.guard';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const filters = DashboardFiltersSchema.parse(query);
    return this.statistics.dashboard(user, filters);
  }

  @Get('statistics')
  stats(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const filters = DashboardFiltersSchema.parse(query);
    return this.statistics.statistics(user, filters);
  }
}
