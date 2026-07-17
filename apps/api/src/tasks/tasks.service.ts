import { Injectable } from '@nestjs/common';
import { parseTaskLabel } from '@ghc/domain';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async start(developerId: string, label: string, projectId?: string) {
    await this.prisma.task.updateMany({
      where: { developerId, active: true },
      data: { active: false, endedAt: new Date() },
    });
    const parsed = parseTaskLabel(label);
    return this.prisma.task.create({
      data: {
        developerId,
        projectId,
        name: parsed.name,
        jiraId: parsed.jiraId,
        active: true,
      },
    });
  }

  async end(developerId: string) {
    const result = await this.prisma.task.updateMany({
      where: { developerId, active: true },
      data: { active: false, endedAt: new Date() },
    });
    return { ended: result.count };
  }

  list(viewer: { id: string; role: string }, developerId?: string) {
    const scopedId = viewer.role === 'DEVELOPER' ? viewer.id : developerId;
    return this.prisma.task.findMany({
      where: scopedId ? { developerId: scopedId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: 100,
      include: {
        developer: { select: { id: true, displayName: true } },
        _count: { select: { events: true } },
      },
    });
  }

  async costs(viewer: { id: string; role: string }, developerId?: string) {
    const scopedId = viewer.role === 'DEVELOPER' ? viewer.id : developerId;
    const tasks = await this.prisma.task.findMany({
      where: scopedId ? { developerId: scopedId } : undefined,
      include: {
        events: { select: { estimatedCredits: true, promptLength: true } },
        developer: { select: { id: true, displayName: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return tasks.map((t) => ({
      id: t.id,
      name: t.name,
      jiraId: t.jiraId,
      developer: t.developer,
      promptCount: t.events.length,
      credits: t.events.reduce((sum, e) => sum + e.estimatedCredits, 0),
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      active: t.active,
    }));
  }
}
