import { Module, OnModuleInit } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisher } from './realtime.publisher';

@Module({
  imports: [AuthModule],
  providers: [RealtimePublisher, RealtimeGateway],
  exports: [RealtimePublisher],
})
export class RealtimeModule implements OnModuleInit {
  constructor(private readonly gateway: RealtimeGateway) {}

  async onModuleInit() {
    await this.gateway.afterInit();
  }
}
