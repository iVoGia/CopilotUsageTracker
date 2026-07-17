import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/roles.guard';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('start')
  start(
    @CurrentUser() user: AuthUser,
    @Body() body: { label: string; projectId?: string },
  ) {
    return this.tasks.start(user.id, body.label, body.projectId);
  }

  @Post('end')
  end(@CurrentUser() user: AuthUser) {
    return this.tasks.end(user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('developerId') developerId?: string) {
    return this.tasks.list(user, developerId);
  }

  @Get('costs')
  costs(@CurrentUser() user: AuthUser, @Query('developerId') developerId?: string) {
    return this.tasks.costs(user, developerId);
  }
}
