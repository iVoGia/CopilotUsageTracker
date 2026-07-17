import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { canViewDeveloper } from '@ghc/domain';
import type { DashboardFilters } from '@ghc/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  resolveRange(filters: DashboardFilters): { from: Date; to: Date } {
    const now = new Date();
    const to = new Date(now);
    const startOfDay = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    switch (filters.range) {
      case 'today':
        return { from: startOfDay(now), to };
      case 'yesterday': {
        const y = startOfDay(now);
        y.setUTCDate(y.getUTCDate() - 1);
        const end = startOfDay(now);
        return { from: y, to: end };
      }
      case '7d': {
        const from = startOfDay(now);
        from.setUTCDate(from.getUTCDate() - 6);
        return { from, to };
      }
      case '30d': {
        const from = startOfDay(now);
        from.setUTCDate(from.getUTCDate() - 29);
        return { from, to };
      }
      case 'sprint':
        return {
          from: filters.sprintStart ? new Date(filters.sprintStart) : startOfDay(now),
          to: filters.sprintEnd ? new Date(filters.sprintEnd) : to,
        };
      default:
        return { from: startOfDay(now), to };
    }
  }

  applyViewerScope(
    viewer: { id: string; role: Role },
    developerId?: string,
  ): string | undefined {
    if (viewer.role === Role.DEVELOPER) {
      if (developerId && developerId !== viewer.id) {
        throw new ForbiddenException('Developers can only view their own usage');
      }
      return viewer.id;
    }
    if (developerId && !canViewDeveloper(viewer.role as never, viewer.id, developerId)) {
      throw new ForbiddenException();
    }
    return developerId;
  }

  async dashboard(viewer: { id: string; role: Role }, filters: DashboardFilters) {
    const scopedDeveloperId = this.applyViewerScope(viewer, filters.developerId);
    const { from, to } = this.resolveRange(filters);

    const where = {
      day: { gte: from, lte: to },
      ...(scopedDeveloperId ? { developerId: scopedDeveloperId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.model ? { model: filters.model } : {}),
    };

    const rows = await this.prisma.dailyStatistic.findMany({ where });

    const totals = rows.reduce(
      (acc, r) => {
        acc.prompts += r.promptCount;
        acc.credits += r.credits;
        acc.inputTokens += r.inputTokens;
        acc.outputTokens += r.outputTokens;
        acc.promptLength += r.totalPromptLength;
        acc.responseLength += r.totalResponseLength;
        return acc;
      },
      { prompts: 0, credits: 0, inputTokens: 0, outputTokens: 0, promptLength: 0, responseLength: 0 },
    );

    const byModel = new Map<string, { prompts: number; credits: number }>();
    const byDeveloper = new Map<string, { prompts: number; credits: number }>();
    const byDay = new Map<string, { prompts: number; credits: number }>();

    for (const r of rows) {
      const m = byModel.get(r.model) ?? { prompts: 0, credits: 0 };
      m.prompts += r.promptCount;
      m.credits += r.credits;
      byModel.set(r.model, m);

      const d = byDeveloper.get(r.developerId) ?? { prompts: 0, credits: 0 };
      d.prompts += r.promptCount;
      d.credits += r.credits;
      byDeveloper.set(r.developerId, d);

      const dayKey = r.day.toISOString().slice(0, 10);
      const day = byDay.get(dayKey) ?? { prompts: 0, credits: 0 };
      day.prompts += r.promptCount;
      day.credits += r.credits;
      byDay.set(dayKey, day);
    }

    const developerIds = [...byDeveloper.keys()];
    const developers = developerIds.length
      ? await this.prisma.developer.findMany({
          where: { id: { in: developerIds } },
          select: { id: true, displayName: true, email: true, role: true },
        })
      : [];

    const activeDevelopers = byDeveloper.size;
    const sessions = await this.prisma.session.count({
      where: {
        startedAt: { gte: from, lte: to },
        ...(scopedDeveloperId ? { developerId: scopedDeveloperId } : {}),
      },
    });

    return {
      range: { from, to, label: filters.range },
      totals: {
        ...totals,
        averagePromptLength: totals.prompts ? totals.promptLength / totals.prompts : 0,
        averageResponseLength: totals.prompts ? totals.responseLength / totals.prompts : 0,
        activeDevelopers,
        sessions,
      },
      topModels: [...byModel.entries()]
        .map(([model, v]) => ({ model, ...v }))
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 10),
      topUsers: [...byDeveloper.entries()]
        .map(([id, v]) => ({
          developerId: id,
          displayName: developers.find((d) => d.id === id)?.displayName ?? id,
          ...v,
        }))
        .sort((a, b) => b.prompts - a.prompts)
        .slice(0, 10),
      dailyUsage: [...byDay.entries()]
        .map(([day, v]) => ({ day, ...v }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      creditsTrend: [...byDay.entries()]
        .map(([day, v]) => ({ day, credits: v.credits }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      aiAdoption: {
        activeDevelopers,
        prompts: totals.prompts,
        promptsPerActiveDev: activeDevelopers ? totals.prompts / activeDevelopers : 0,
      },
    };
  }

  async statistics(viewer: { id: string; role: Role }, filters: DashboardFilters) {
    return this.dashboard(viewer, filters);
  }
}
