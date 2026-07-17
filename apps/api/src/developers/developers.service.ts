import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevelopersService {
  constructor(private readonly prisma: PrismaService) {}

  list(viewer: { id: string; role: Role }) {
    if (viewer.role === Role.DEVELOPER) {
      return this.prisma.developer.findMany({
        where: { id: viewer.id },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
    }
    return this.prisma.developer.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async get(viewer: { id: string; role: Role }, id: string) {
    if (viewer.role === Role.DEVELOPER && viewer.id !== id) {
      throw new ForbiddenException();
    }
    return this.prisma.developer.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}
