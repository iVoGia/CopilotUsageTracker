import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SessionsService } from '../sessions/sessions.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sessions = app.get(SessionsService);
  const logger = new Logger('SessionWorker');
  const intervalMs = Number(process.env.SESSION_WORKER_INTERVAL_MS ?? 60_000);

  logger.log(`Session closer worker started (every ${intervalMs}ms)`);
  const tick = async () => {
    try {
      const result = await sessions.closeInactive();
      if (result.closed > 0) {
        logger.log(`Closed ${result.closed} inactive sessions`);
      }
    } catch (err) {
      logger.error(`Worker tick failed: ${(err as Error).message}`);
    }
  };

  await tick();
  setInterval(tick, intervalMs);
}

bootstrap();
