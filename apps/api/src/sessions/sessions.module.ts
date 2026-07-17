import { Module } from '@nestjs/common';
import { SessionsController, SessionsListController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController, SessionsListController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
