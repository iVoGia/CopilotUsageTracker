import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  start(developerId: string, input: { projectId?: string; workspaceName?: string; gitBranch?: string }) {
    return this.prisma.session.create({
      data: {
        developerId,
        projectId: input.projectId,
        status: SessionStatus.OPEN,
      },
    });
  }

  async end(developerId: string, sessionId?: string) {
    const session = sessionId
      ? await this.prisma.session.findFirst({
          where: { id: sessionId, developerId, status: SessionStatus.OPEN },
        })
      : await this.prisma.session.findFirst({
          where: { developerId, status: SessionStatus.OPEN },
          orderBy: { lastActivityAt: 'desc' },
        });

    if (!session) return { closed: false };
    const updated = await this.prisma.session.update({
      where: { id: session.id },
      data: { status: SessionStatus.CLOSED, endedAt: new Date() },
    });
    return { closed: true, session: updated };
  }

  async list(viewer: { id: string; role: string }, filters: { developerId?: string; take?: number }) {
    const developerId =
      viewer.role === 'DEVELOPER' ? viewer.id : filters.developerId;

    return this.prisma.session.findMany({
      where: developerId ? { developerId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: filters.take ?? 50,
      include: {
        developer: { select: { id: true, displayName: true, email: true } },
        project: true,
      },
    });
  }

  async closeInactive(now = new Date(), inactivityMs = 30 * 60 * 1000) {
    const cutoff = new Date(now.getTime() - inactivityMs);
    const result = await this.prisma.session.updateMany({
      where: {
        status: SessionStatus.OPEN,
        lastActivityAt: { lt: cutoff },
      },
      data: {
        status: SessionStatus.CLOSED,
        endedAt: now,
      },
    });
    return { closed: result.count };
  }

  summarize(session: {
    startedAt: Date;
    endedAt: Date | null;
    lastActivityAt: Date;
    promptCount: number;
    totalPromptLength: number;
    totalResponseLength: number;
    creditsUsed: number;
  }) {
    const end = session.endedAt ?? session.lastActivityAt;
    const durationMs = end.getTime() - session.startedAt.getTime();
    return {
      durationMs,
      promptCount: session.promptCount,
      averagePromptSize: session.promptCount
        ? session.totalPromptLength / session.promptCount
        : 0,
      averageResponseSize: session.promptCount
        ? session.totalResponseLength / session.promptCount
        : 0,
      creditsUsed: session.creditsUsed,
    };
  }
}
