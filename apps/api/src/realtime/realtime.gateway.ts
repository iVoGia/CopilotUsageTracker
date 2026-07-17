import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { REALTIME_CHANNEL, type RealtimeUsagePayload } from '@ghc/shared';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/auth.service';

type AuthedSocket = Socket & {
  data: { user?: { id: string; role: Role } };
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private subscriber?: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async afterInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.subscriber = new Redis(url, { maxRetriesPerRequest: null });
    await this.subscriber.subscribe(REALTIME_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const payload = JSON.parse(message) as RealtimeUsagePayload;
        this.server.to('team').emit('usage.event.created', payload);
        this.server.to(`developer:${payload.developerId}`).emit('usage.event.created', payload);
      } catch (err) {
        this.logger.warn(`Invalid realtime payload: ${(err as Error).message}`);
      }
    });
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') as string | undefined);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.user = { id: payload.sub, role: payload.role };
      await client.join(`developer:${payload.sub}`);
      if (payload.role === Role.LEADER || payload.role === Role.ADMIN) {
        await client.join('team');
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: AuthedSocket) {
    // no-op
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthedSocket, @MessageBody() _body: unknown) {
    return { event: 'pong', data: { userId: client.data.user?.id } };
  }
}
