import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsService } from '../statistics/statistics.service';
import type { DashboardFilters } from '@ghc/shared';

@Injectable()
export class CreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statistics: StatisticsService,
  ) {}

  listRates() {
    return this.prisma.creditEstimation.findMany({
      where: { active: true },
      orderBy: [{ provider: 'asc' }, { model: 'asc' }, { version: 'desc' }],
    });
  }

  async usage(viewer: { id: string; role: Role }, filters: DashboardFilters) {
    const dash = await this.statistics.dashboard(viewer, filters);
    return {
      range: dash.range,
      totalCredits: dash.totals.credits,
      creditsTrend: dash.creditsTrend,
      byModel: dash.topModels,
      byUser: dash.topUsers,
    };
  }
}
