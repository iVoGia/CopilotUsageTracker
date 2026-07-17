import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { DevelopersModule } from './developers/developers.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SessionsModule } from './sessions/sessions.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DevelopersModule,
    EventsModule,
    SessionsModule,
    TasksModule,
    StatisticsModule,
    CreditsModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}
