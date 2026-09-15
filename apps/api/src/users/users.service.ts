import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database';
import { User } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface SupabaseUserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Find user by ID or create user record using the Supabase Auth UUID.
   * Ensures 1:1 mapping between auth.users.id and public.users.id.
   */
  async findOrCreateFromSupabase(supaUser: SupabaseUserPayload): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: supaUser.id },
    });

    if (existingUser) {
      return existingUser;
    }

    this.logger.log(`Creating application user profile for Supabase ID: ${supaUser.id}`);

    const newUser = await this.prisma.user.create({
      data: {
        id: supaUser.id,
        email: supaUser.email,
        firstName: supaUser.firstName ?? null,
        lastName: supaUser.lastName ?? null,
        avatarUrl: supaUser.avatarUrl ?? null,
        isActive: true,
      },
    });

    await this.auditLogsService.log({
      actorId: newUser.id,
      action: 'user.created',
      targetResource: `user:${newUser.id}`,
      metadata: { email: newUser.email },
    });

    return newUser;
  }

  /**
   * Find application user by ID.
   */
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Update user profile information.
   */
  async updateProfile(
    id: string,
    data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ): Promise<User> {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
