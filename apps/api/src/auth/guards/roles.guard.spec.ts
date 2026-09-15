import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database';
import { ForbiddenException, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: any;
  let mockPrismaService: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    mockPrismaService = {
      membership: {
        findMany: vi.fn(),
      },
    };

    guard = new RolesGuard(
      mockReflector as unknown as Reflector,
      mockPrismaService as unknown as PrismaService,
    );
  });

  const createMockContext = (requestPayload: any): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => requestPayload,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ user: { userId: 'user-1' } });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should throw UnauthorizedException if request has no authenticated user', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.CUSTOMER_ADMIN]);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow access if user has global ACTIVE SUPER_ADMIN membership', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.CUSTOMER_ADMIN]);
    mockPrismaService.membership.findMany.mockResolvedValue([
      { organizationId: 'org-1', role: Role.SUPER_ADMIN, status: 'ACTIVE' },
    ]);

    const context = createMockContext({
      user: { userId: 'super-admin-user' },
      body: { organizationId: 'org-2' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if user has required role in target organization', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.CUSTOMER_ADMIN, Role.SUPER_ADMIN]);
    mockPrismaService.membership.findMany.mockResolvedValue([
      { organizationId: 'org-1', role: Role.CUSTOMER_ADMIN, status: 'ACTIVE' },
    ]);

    const context = createMockContext({
      user: { userId: 'user-1' },
      query: { organizationId: 'org-1' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access if user role in target organization does not match required roles', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.CUSTOMER_ADMIN, Role.SUPER_ADMIN]);
    mockPrismaService.membership.findMany.mockResolvedValue([
      { organizationId: 'org-1', role: Role.AGENT, status: 'ACTIVE' },
    ]);

    const context = createMockContext({
      user: { userId: 'user-1' },
      query: { organizationId: 'org-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access if organizationId cannot be determined', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.CUSTOMER_ADMIN]);
    mockPrismaService.membership.findMany.mockResolvedValue([]);

    const context = createMockContext({
      user: { userId: 'user-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
