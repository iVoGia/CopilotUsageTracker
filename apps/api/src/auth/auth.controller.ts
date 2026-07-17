import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './jwt.strategy';
import { JwtAuthGuard } from './roles.guard';
import { UseGuards } from '@nestjs/common';

class DevLoginDto {
  githubId!: string;
  displayName!: string;
  email?: string;
  role?: Role;
}

class GitHubCodeDto {
  code!: string;
}

class RefreshDto {
  refreshToken!: string;
}

class DeviceTokenDto {
  deviceLabel?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('dev-login')
  devLogin(@Body() body: DevLoginDto) {
    return this.auth.loginWithGitHubProfile(body);
  }

  @Post('github')
  github(@Body() body: GitHubCodeDto) {
    return this.auth.exchangeGitHubCode(body.code);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('device')
  device(@CurrentUser() user: AuthUser, @Body() body: DeviceTokenDto) {
    return this.auth.issueDeviceToken(user.id, body.deviceLabel);
  }
}
