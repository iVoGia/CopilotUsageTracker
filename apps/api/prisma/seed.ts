import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/** Official GitHub Copilot per-1M-token USD rates (docs.github.com/copilot models-and-pricing). */
type RateRow = {
  provider: string;
  model: string;
  usdPer1MInput: number;
  usdPer1MCachedInput: number;
  usdPer1MCacheWrite?: number;
  usdPer1MOutput: number;
  longContextThreshold?: number;
};

const rates: RateRow[] = [
  // OpenAI
  { provider: 'OpenAI', model: 'gpt-5-mini', usdPer1MInput: 0.25, usdPer1MCachedInput: 0.025, usdPer1MOutput: 2 },
  { provider: 'OpenAI', model: 'gpt-5.3-codex', usdPer1MInput: 1.75, usdPer1MCachedInput: 0.175, usdPer1MOutput: 14 },
  { provider: 'OpenAI', model: 'gpt-5.4', usdPer1MInput: 2.5, usdPer1MCachedInput: 0.25, usdPer1MOutput: 15, longContextThreshold: 272_000 },
  { provider: 'OpenAI', model: 'gpt-5.4-long', usdPer1MInput: 5, usdPer1MCachedInput: 0.5, usdPer1MOutput: 22.5 },
  { provider: 'OpenAI', model: 'gpt-5.4-mini', usdPer1MInput: 0.75, usdPer1MCachedInput: 0.075, usdPer1MOutput: 4.5 },
  { provider: 'OpenAI', model: 'gpt-5.4-nano', usdPer1MInput: 0.2, usdPer1MCachedInput: 0.02, usdPer1MOutput: 1.25 },
  { provider: 'OpenAI', model: 'gpt-5.5', usdPer1MInput: 5, usdPer1MCachedInput: 0.5, usdPer1MOutput: 30, longContextThreshold: 272_000 },
  { provider: 'OpenAI', model: 'gpt-5.5-long', usdPer1MInput: 10, usdPer1MCachedInput: 1, usdPer1MOutput: 45 },
  { provider: 'OpenAI', model: 'gpt-4.1', usdPer1MInput: 2, usdPer1MCachedInput: 0.5, usdPer1MOutput: 8 },
  { provider: 'OpenAI', model: 'gpt-4o', usdPer1MInput: 2.5, usdPer1MCachedInput: 1.25, usdPer1MOutput: 10 },
  // Anthropic
  { provider: 'Anthropic', model: 'claude-haiku-4.5', usdPer1MInput: 1, usdPer1MCachedInput: 0.1, usdPer1MCacheWrite: 1.25, usdPer1MOutput: 5 },
  { provider: 'Anthropic', model: 'claude-sonnet-4', usdPer1MInput: 3, usdPer1MCachedInput: 0.3, usdPer1MCacheWrite: 3.75, usdPer1MOutput: 15 },
  { provider: 'Anthropic', model: 'claude-sonnet-4.5', usdPer1MInput: 3, usdPer1MCachedInput: 0.3, usdPer1MCacheWrite: 3.75, usdPer1MOutput: 15 },
  { provider: 'Anthropic', model: 'claude-sonnet-4.6', usdPer1MInput: 3, usdPer1MCachedInput: 0.3, usdPer1MCacheWrite: 3.75, usdPer1MOutput: 15 },
  { provider: 'Anthropic', model: 'claude-sonnet', usdPer1MInput: 3, usdPer1MCachedInput: 0.3, usdPer1MCacheWrite: 3.75, usdPer1MOutput: 15 },
  { provider: 'Anthropic', model: 'claude-opus-4.5', usdPer1MInput: 5, usdPer1MCachedInput: 0.5, usdPer1MCacheWrite: 6.25, usdPer1MOutput: 25 },
  { provider: 'Anthropic', model: 'claude-opus-4.6', usdPer1MInput: 5, usdPer1MCachedInput: 0.5, usdPer1MCacheWrite: 6.25, usdPer1MOutput: 25 },
  { provider: 'Anthropic', model: 'claude-opus-4.7', usdPer1MInput: 5, usdPer1MCachedInput: 0.5, usdPer1MCacheWrite: 6.25, usdPer1MOutput: 25 },
  { provider: 'Anthropic', model: 'claude-opus-4.8', usdPer1MInput: 5, usdPer1MCachedInput: 0.5, usdPer1MCacheWrite: 6.25, usdPer1MOutput: 25 },
  { provider: 'Anthropic', model: 'claude-sonnet-5', usdPer1MInput: 2, usdPer1MCachedInput: 0.2, usdPer1MCacheWrite: 2.5, usdPer1MOutput: 10 },
  // Google
  { provider: 'Google', model: 'gemini-2.5-pro', usdPer1MInput: 1.25, usdPer1MCachedInput: 0.125, usdPer1MOutput: 10 },
  { provider: 'Google', model: 'gemini-3-flash', usdPer1MInput: 0.5, usdPer1MCachedInput: 0.05, usdPer1MOutput: 3 },
  { provider: 'Google', model: 'gemini-3.1-pro', usdPer1MInput: 2, usdPer1MCachedInput: 0.2, usdPer1MOutput: 12, longContextThreshold: 200_000 },
  { provider: 'Google', model: 'gemini-3.1-pro-long', usdPer1MInput: 4, usdPer1MCachedInput: 0.4, usdPer1MOutput: 18 },
  { provider: 'Google', model: 'gemini-3.5-flash', usdPer1MInput: 1.5, usdPer1MCachedInput: 0.15, usdPer1MOutput: 9 },
  { provider: 'Google', model: 'gemini-2.0', usdPer1MInput: 0.5, usdPer1MCachedInput: 0.05, usdPer1MOutput: 3 },
  // GitHub / Microsoft / others
  { provider: 'GitHub', model: 'raptor-mini', usdPer1MInput: 0.25, usdPer1MCachedInput: 0.025, usdPer1MOutput: 2 },
  { provider: 'Microsoft', model: 'mai-code-1-flash', usdPer1MInput: 0.75, usdPer1MCachedInput: 0.075, usdPer1MOutput: 4.5 },
  { provider: 'Moonshot', model: 'kimi-k2.7-code', usdPer1MInput: 0.95, usdPer1MCachedInput: 0.19, usdPer1MOutput: 4 },
];

async function main() {
  for (const r of rates) {
    await prisma.creditEstimation.upsert({
      where: {
        provider_model_version: {
          provider: r.provider,
          model: r.model,
          version: 1,
        },
      },
      create: {
        id: randomUUID(),
        provider: r.provider,
        model: r.model,
        version: 1,
        usdPer1MInput: r.usdPer1MInput,
        usdPer1MCachedInput: r.usdPer1MCachedInput,
        usdPer1MCacheWrite: r.usdPer1MCacheWrite ?? 0,
        usdPer1MOutput: r.usdPer1MOutput,
        longContextThreshold: r.longContextThreshold ?? null,
        active: true,
      },
      update: {
        usdPer1MInput: r.usdPer1MInput,
        usdPer1MCachedInput: r.usdPer1MCachedInput,
        usdPer1MCacheWrite: r.usdPer1MCacheWrite ?? 0,
        usdPer1MOutput: r.usdPer1MOutput,
        longContextThreshold: r.longContextThreshold ?? null,
        active: true,
      },
    });
  }

  await prisma.developer.upsert({
    where: { githubId: 'admin-1' },
    create: {
      id: randomUUID(),
      githubId: 'admin-1',
      displayName: 'Admin User',
      email: 'admin@example.com',
      role: Role.ADMIN,
    },
    update: {},
  });

  await prisma.developer.upsert({
    where: { githubId: 'leader-1' },
    create: {
      id: randomUUID(),
      githubId: 'leader-1',
      displayName: 'Team Leader',
      email: 'leader@example.com',
      role: Role.LEADER,
    },
    update: {},
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
