import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/roles.guard';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('session')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('start')
  start(@CurrentUser() user: AuthUser, @Body() body: { projectId?: string }) {
    return this.sessions.start(user.id, body ?? {});
  }

  @Post('end')
  end(@CurrentUser() user: AuthUser, @Body() body: { sessionId?: string }) {
    return this.sessions.end(user.id, body?.sessionId);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('developerId') developerId?: string,
    @Query('take') take?: string,
  ) {
    return this.sessions.list(user, {
      developerId,
      take: take ? Number(take) : undefined,
    });
  }
}

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsListController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('developerId') developerId?: string,
    @Query('take') take?: string,
  ) {
    return this.sessions.list(user, {
      developerId,
      take: take ? Number(take) : undefined,
    });
  }
}
