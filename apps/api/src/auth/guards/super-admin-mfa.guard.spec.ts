import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SuperAdminMfaGuard } from './super-admin-mfa.guard';
import { PrismaService } from '../../database';
import { Role, MembershipStatus } from '@prisma/client';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('SuperAdminMfaGuard', () => {
  let guard: SuperAdminMfaGuard;
  let mockPrismaService: {
    membership: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  const createMockContext = (requestPayload: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => requestPayload,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockPrismaService = {
      membership: {
        findFirst: vi.fn(),
      },
    };

    guard = new SuperAdminMfaGuard(mockPrismaService as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('1. SUPER_ADMIN + aal2 -> allowed', async () => {
    const user: AuthenticatedUser = {
      userId: 'super-admin-uuid',
      email: 'admin@minstocs.com',
      aal: 'aal2',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue({
      id: 'mem-1',
      userId: 'super-admin-uuid',
      organizationId: 'org-1',
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    });

    const context = createMockContext({ user });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrismaService.membership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'super-admin-uuid',
        role: Role.SUPER_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });
  });

  it('2. SUPER_ADMIN + aal1 -> rejected with 403 ForbiddenException', async () => {
    const user: AuthenticatedUser = {
      userId: 'super-admin-uuid',
      email: 'admin@minstocs.com',
      aal: 'aal1',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue({
      id: 'mem-1',
      userId: 'super-admin-uuid',
      organizationId: 'org-1',
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    });

    const context = createMockContext({ user });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Multi-factor authentication required',
    );
  });

  it('3. SUPER_ADMIN + missing aal (defaulted to aal1) -> rejected with 403 ForbiddenException', async () => {
    const user: AuthenticatedUser = {
      userId: 'super-admin-uuid',
      email: 'admin@minstocs.com',
      aal: 'aal1',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue({
      id: 'mem-1',
      userId: 'super-admin-uuid',
      organizationId: 'org-1',
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    });

    const context = createMockContext({ user });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('4. CUSTOMER_ADMIN + aal1 -> allowed without MFA requirement', async () => {
    const user: AuthenticatedUser = {
      userId: 'customer-admin-uuid',
      email: 'customeradmin@tenant.com',
      aal: 'aal1',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue(null);

    const context = createMockContext({ user });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('5. MANAGER + aal1 -> allowed without MFA requirement', async () => {
    const user: AuthenticatedUser = {
      userId: 'manager-uuid',
      email: 'manager@tenant.com',
      aal: 'aal1',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue(null);

    const context = createMockContext({ user });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('6. AGENT + aal1 -> allowed without MFA requirement', async () => {
    const user: AuthenticatedUser = {
      userId: 'agent-uuid',
      email: 'agent@tenant.com',
      aal: 'aal1',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue(null);

    const context = createMockContext({ user });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('7. Unauthenticated request (no user) -> throws UnauthorizedException', async () => {
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('8. Client sending fake MFA headers/body fields -> does not bypass MFA guard', async () => {
    const user: AuthenticatedUser = {
      userId: 'super-admin-uuid',
      email: 'admin@minstocs.com',
      aal: 'aal1',
    };

    mockPrismaService.membership.findFirst.mockResolvedValue({
      id: 'mem-1',
      userId: 'super-admin-uuid',
      organizationId: 'org-1',
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    });

    const context = createMockContext({
      user,
      headers: {
        'x-mfa-verified': 'true',
        'authorization': 'Bearer fake-token',
      },
      body: {
        aal: 'aal2',
        mfa: true,
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
