import { Module } from '@nestjs/common';
import { StatisticsModule } from '../statistics/statistics.module';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';

@Module({
  imports: [StatisticsModule],
  controllers: [CreditsController],
  providers: [CreditsService],
})
export class CreditsModule {}
