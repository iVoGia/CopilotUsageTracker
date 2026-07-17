import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type JwtPayload = {
  sub: string;
  role: Role;
  displayName: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Dev/pilot login: upsert developer by githubId.
   * Production wire-up: exchange GitHub OAuth code, then call this with profile.
   */
  async loginWithGitHubProfile(input: {
    githubId: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    role?: Role;
  }) {
    const developer = await this.prisma.developer.upsert({
      where: { githubId: input.githubId },
      create: {
        githubId: input.githubId,
        displayName: input.displayName,
        email: input.email,
        avatarUrl: input.avatarUrl,
        role: input.role ?? Role.DEVELOPER,
      },
      update: {
        displayName: input.displayName,
        email: input.email,
        avatarUrl: input.avatarUrl,
      },
    });

    return this.issueTokens(developer.id, developer.role, developer.displayName);
  }

  async issueDeviceToken(developerId: string, deviceLabel?: string) {
    const developer = await this.prisma.developer.findUnique({ where: { id: developerId } });
    if (!developer) throw new UnauthorizedException('Developer not found');
    return this.issueTokens(developer.id, developer.role, developer.displayName, deviceLabel);
  }

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const developer = await this.prisma.developer.findUniqueOrThrow({
      where: { id: stored.developerId },
    });
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(developer.id, developer.role, developer.displayName, stored.deviceLabel ?? undefined);
  }

  private async issueTokens(
    developerId: string,
    role: Role,
    displayName: string,
    deviceLabel?: string,
  ) {
    const payload: JwtPayload = { sub: developerId, role, displayName };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '1h') as `${number}h` | `${number}m` | number,
    });
    const refreshToken = randomBytes(48).toString('hex');
    const days = Number(this.config.get('REFRESH_TOKEN_DAYS', 30));
    await this.prisma.refreshToken.create({
      data: {
        developerId,
        tokenHash: this.hashToken(refreshToken),
        deviceLabel,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN', '1h'),
      developer: { id: developerId, role, displayName },
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Exchange GitHub code when GITHUB_CLIENT_ID/SECRET are configured. */
  async exchangeGitHubCode(code: string) {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'GitHub OAuth is not configured. Use POST /auth/dev-login for local pilot.',
      );
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new UnauthorizedException(tokenJson.error ?? 'GitHub token exchange failed');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const user = (await userRes.json()) as {
      id: number;
      login: string;
      name?: string;
      email?: string;
      avatar_url?: string;
    };

    return this.loginWithGitHubProfile({
      githubId: String(user.id),
      displayName: user.name ?? user.login,
      email: user.email,
      avatarUrl: user.avatar_url,
    });
  }
}
