import { Injectable } from '@nestjs/common';
import { EventKind, SessionStatus } from '@prisma/client';
import { assertNoForbiddenFields } from '@ghc/domain';
import type { UsageEventInput } from '@ghc/shared';
import { defaultTokenEstimator } from '@ghc/token-estimator';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async ingestBatch(developerId: string, events: UsageEventInput[]) {
    const results = [];
    for (const event of events) {
      assertNoForbiddenFields(event as unknown as Record<string, unknown>);
      results.push(await this.ingestOne(developerId, event));
    }
    return { accepted: results.length, events: results };
  }

  private async ingestOne(developerId: string, input: UsageEventInput) {
    const existing = await this.prisma.event.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return { id: existing.id, duplicate: true };
    }

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    // Always resolve a project so rollup unique keys never use NULL (Postgres UNIQUE + NULL).
    const project = await this.prisma.project.upsert({
      where: {
        workspaceName_gitBranch: {
          workspaceName: input.project?.workspaceName ?? 'unassigned',
          gitBranch: input.project?.gitBranch ?? '',
        },
      },
      create: {
        workspaceName: input.project?.workspaceName ?? 'unassigned',
        gitBranch: input.project?.gitBranch ?? '',
      },
      update: {},
    });

    let session =
      (input.sessionId
        ? await this.prisma.session.findFirst({
            where: { id: input.sessionId, developerId, status: SessionStatus.OPEN },
          })
        : null) ??
      (await this.prisma.session.findFirst({
        where: { developerId, status: SessionStatus.OPEN },
        orderBy: { lastActivityAt: 'desc' },
      }));

    if (!session) {
      session = await this.prisma.session.create({
        data: {
          developerId,
          projectId: project.id,
          lastActivityAt: occurredAt,
          startedAt: occurredAt,
        },
      });
    }

    const activeTask =
      (input.taskId
        ? await this.prisma.task.findFirst({
            where: { id: input.taskId, developerId },
          })
        : null) ??
      (await this.prisma.task.findFirst({
        where: { developerId, active: true },
        orderBy: { startedAt: 'desc' },
      }));

    const rate = await this.prisma.creditEstimation.findFirst({
      where: {
        provider: { equals: input.provider, mode: 'insensitive' },
        model: { equals: input.model, mode: 'insensitive' },
        active: true,
      },
      orderBy: { version: 'desc' },
    });

    const inputTokens = defaultTokenEstimator.estimateInput({
      provider: input.provider,
      model: input.model,
      charLength: input.promptLength,
    });
    const outputTokens = defaultTokenEstimator.estimateOutput({
      provider: input.provider,
      model: input.model,
      charLength: input.responseLength,
    });
    const estimatedCredits = defaultTokenEstimator.estimateCredits({
      provider: input.provider,
      model: input.model,
      inputTokens,
      outputTokens,
      rate: rate
        ? {
            inputCreditsPer1kTokens: rate.inputCreditsPer1kTokens,
            outputCreditsPer1kTokens: rate.outputCreditsPer1kTokens,
          }
        : undefined,
    });

    const day = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), occurredAt.getUTCDate()));
    const yearMonth = `${occurredAt.getUTCFullYear()}-${String(occurredAt.getUTCMonth() + 1).padStart(2, '0')}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          kind: (input.kind as EventKind) ?? EventKind.CHAT,
          developerId,
          sessionId: session!.id,
          projectId: project.id,
          taskId: activeTask?.id,
          creditEstimationId: rate?.id,
          provider: input.provider,
          model: input.model,
          promptLength: input.promptLength,
          responseLength: input.responseLength,
          inputTokens,
          outputTokens,
          estimatedCredits,
          durationMs: input.durationMs,
          success: input.success,
          errorCode: input.errorCode,
          machineId: input.environment?.machineId,
          vscodeVersion: input.environment?.vscodeVersion,
          copilotExtensionVersion: input.environment?.copilotExtensionVersion,
          occurredAt,
        },
      });

      await tx.session.update({
        where: { id: session!.id },
        data: {
          lastActivityAt: occurredAt,
          projectId: project.id,
          promptCount: { increment: 1 },
          totalPromptLength: { increment: input.promptLength },
          totalResponseLength: { increment: input.responseLength },
          creditsUsed: { increment: estimatedCredits },
        },
      });

      await tx.dailyStatistic.upsert({
        where: {
          day_developerId_projectId_model: {
            day,
            developerId,
            projectId: project.id,
            model: input.model,
          },
        },
        create: {
          day,
          developerId,
          projectId: project.id,
          model: input.model,
          promptCount: 1,
          totalPromptLength: input.promptLength,
          totalResponseLength: input.responseLength,
          inputTokens,
          outputTokens,
          credits: estimatedCredits,
          successCount: input.success ? 1 : 0,
          errorCount: input.success ? 0 : 1,
        },
        update: {
          promptCount: { increment: 1 },
          totalPromptLength: { increment: input.promptLength },
          totalResponseLength: { increment: input.responseLength },
          inputTokens: { increment: inputTokens },
          outputTokens: { increment: outputTokens },
          credits: { increment: estimatedCredits },
          successCount: { increment: input.success ? 1 : 0 },
          errorCount: { increment: input.success ? 0 : 1 },
        },
      });

      await tx.monthlyStatistic.upsert({
        where: {
          yearMonth_developerId_projectId_model: {
            yearMonth,
            developerId,
            projectId: project.id,
            model: input.model,
          },
        },
        create: {
          yearMonth,
          developerId,
          projectId: project.id,
          model: input.model,
          promptCount: 1,
          totalPromptLength: input.promptLength,
          totalResponseLength: input.responseLength,
          inputTokens,
          outputTokens,
          credits: estimatedCredits,
          successCount: input.success ? 1 : 0,
          errorCount: input.success ? 0 : 1,
        },
        update: {
          promptCount: { increment: 1 },
          totalPromptLength: { increment: input.promptLength },
          totalResponseLength: { increment: input.responseLength },
          inputTokens: { increment: inputTokens },
          outputTokens: { increment: outputTokens },
          credits: { increment: estimatedCredits },
          successCount: { increment: input.success ? 1 : 0 },
          errorCount: { increment: input.success ? 0 : 1 },
        },
      });

      return event;
    });

    await this.realtime.publishUsageEvent({
      type: 'usage.event.created',
      eventId: created.id,
      developerId,
      sessionId: session.id,
      model: input.model,
      provider: input.provider,
      estimatedCredits,
      occurredAt: occurredAt.toISOString(),
    });

    return {
      id: created.id,
      duplicate: false,
      sessionId: session.id,
      inputTokens,
      outputTokens,
      estimatedCredits,
    };
  }
}
