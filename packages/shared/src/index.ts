import { z } from 'zod';

export const RoleSchema = z.enum(['DEVELOPER', 'LEADER', 'ADMIN']);
export const EventKindSchema = z.enum(['CHAT', 'COMPLETION']);
export const DateRangeSchema = z.enum(['today', 'yesterday', '7d', '30d', 'sprint']);
export const TokenSourceSchema = z.enum(['manual', 'cursor-local', 'copilot-debug']);

export const UsageEventInputSchema = z
  .object({
    idempotencyKey: z.string().min(8).max(128),
    kind: EventKindSchema.default('CHAT'),
    occurredAt: z.string().datetime().optional(),
    durationMs: z.number().int().nonnegative().optional(),
    success: z.boolean().default(true),
    errorCode: z.string().max(64).optional(),
    provider: z.string().min(1).max(64),
    model: z.string().min(1).max(128),
    promptLength: z.number().int().nonnegative(),
    responseLength: z.number().int().nonnegative().default(0),
    estimatedInputTokens: z.number().int().nonnegative().optional(),
    estimatedOutputTokens: z.number().int().nonnegative().optional(),
    estimatedCredits: z.number().nonnegative().optional(),
    tokenSource: TokenSourceSchema.optional(),
    sessionId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    project: z
      .object({
        workspaceName: z.string().min(1).max(256),
        gitBranch: z.string().max(256).optional(),
      })
      .optional(),
    environment: z
      .object({
        machineId: z.string().min(1).max(128),
        vscodeVersion: z.string().max(64).optional(),
        copilotExtensionVersion: z.string().max(64).optional(),
      })
      .optional(),
  })
  .strict();

export const BatchEventsSchema = z
  .object({
    events: z.array(UsageEventInputSchema).min(1).max(100),
  })
  .strict();

export const SessionStartSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    workspaceName: z.string().min(1).max(256).optional(),
    gitBranch: z.string().max(256).optional(),
  })
  .strict();

export const TaskStartSchema = z
  .object({
    label: z.string().min(1).max(256),
  })
  .strict();

export const DashboardFiltersSchema = z.object({
  range: DateRangeSchema.default('7d'),
  developerId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  model: z.string().optional(),
  sprintStart: z.string().datetime().optional(),
  sprintEnd: z.string().datetime().optional(),
});

export type UsageEventInput = z.infer<typeof UsageEventInputSchema>;
export type TokenSource = z.infer<typeof TokenSourceSchema>;
export type BatchEventsInput = z.infer<typeof BatchEventsSchema>;
export type DashboardFilters = z.infer<typeof DashboardFiltersSchema>;
export type Role = z.infer<typeof RoleSchema>;

export const REALTIME_CHANNEL = 'ghc:usage';

export type RealtimeUsagePayload = {
  type: 'usage.event.created';
  eventId: string;
  developerId: string;
  sessionId: string;
  model: string;
  provider: string;
  estimatedCredits: number;
  occurredAt: string;
};
