import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const rates = [
    { provider: 'OpenAI', model: 'gpt-4.1', input: 1, output: 3 },
    { provider: 'OpenAI', model: 'gpt-4o', input: 1, output: 3 },
    { provider: 'Anthropic', model: 'claude-sonnet', input: 1.2, output: 3.6 },
    { provider: 'Google', model: 'gemini-2.0', input: 0.8, output: 2.4 },
  ];

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
        inputCreditsPer1kTokens: r.input,
        outputCreditsPer1kTokens: r.output,
        active: true,
      },
      update: {
        inputCreditsPer1kTokens: r.input,
        outputCreditsPer1kTokens: r.output,
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
