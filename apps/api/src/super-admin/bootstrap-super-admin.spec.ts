import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapSuperAdmin, isValidEmail } from './bootstrap-super-admin';
import { PrismaClient, Role, MembershipStatus } from '@prisma/client';
import { SuperAdminController } from './super-admin.controller';

describe('bootstrapSuperAdmin', () => {
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    organization: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    membership: {
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPER_ADMIN_EMAIL;

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      organization: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      membership: {
        update: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
  });

  it('email validator works correctly', () => {
    expect(isValidEmail('admin@minstocs.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('1. Missing SUPER_ADMIN_EMAIL fails safely', async () => {
    await expect(
      bootstrapSuperAdmin(mockPrisma as unknown as PrismaClient),
    ).rejects.toThrow('SUPER_ADMIN_EMAIL environment variable is missing or empty');
  });

  it('2. Invalid SUPER_ADMIN_EMAIL fails safely', async () => {
    await expect(
      bootstrapSuperAdmin(mockPrisma as unknown as PrismaClient, 'invalid-email-format'),
    ).rejects.toThrow('Invalid email address provided for SUPER_ADMIN_EMAIL');
  });

  it('3. User does not exist -> clear failure without creating fake user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      bootstrapSuperAdmin(mockPrisma as unknown as PrismaClient, 'nonexistent@minstocs.com'),
    ).rejects.toThrow("User with email 'nonexistent@minstocs.com' not found in application database");

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nonexistent@minstocs.com' },
      include: { memberships: true },
    });
    expect(mockPrisma.membership.create).not.toHaveBeenCalled();
  });

  it('4. Existing eligible user with existing membership -> SUPER_ADMIN assigned correctly by promotion', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'admin@minstocs.com',
      memberships: [
        {
          id: 'mem-uuid-1',
          userId: 'user-uuid-1',
          organizationId: 'org-uuid-1',
          role: Role.AGENT,
          status: MembershipStatus.ACTIVE,
        },
      ],
    });

    mockPrisma.membership.update.mockResolvedValue({
      id: 'mem-uuid-1',
      userId: 'user-uuid-1',
      organizationId: 'org-uuid-1',
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    });

    const result = await bootstrapSuperAdmin(
      mockPrisma as unknown as PrismaClient,
      'admin@minstocs.com',
    );

    expect(result.success).toBe(true);
    expect(result.membershipId).toBe('mem-uuid-1');
    expect(mockPrisma.membership.update).toHaveBeenCalledWith({
      where: { id: 'mem-uuid-1' },
      data: { role: Role.SUPER_ADMIN },
    });
  });

  it('5. Running bootstrap twice (already SUPER_ADMIN) -> idempotent, no duplicate membership created', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'admin@minstocs.com',
      memberships: [
        {
          id: 'mem-uuid-super',
          userId: 'user-uuid-1',
          organizationId: 'org-uuid-1',
          role: Role.SUPER_ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      ],
    });

    const result = await bootstrapSuperAdmin(
      mockPrisma as unknown as PrismaClient,
      'admin@minstocs.com',
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('already has an active SUPER_ADMIN membership');
    expect(result.membershipId).toBe('mem-uuid-super');
    expect(mockPrisma.membership.update).not.toHaveBeenCalled();
    expect(mockPrisma.membership.create).not.toHaveBeenCalled();
  });

  it('6. Existing SUPER_ADMIN -> remains unchanged', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-existing',
      email: 'existing-superadmin@minstocs.com',
      memberships: [
        {
          id: 'mem-existing-super',
          userId: 'user-uuid-existing',
          organizationId: 'org-1',
          role: Role.SUPER_ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      ],
    });

    const result = await bootstrapSuperAdmin(
      mockPrisma as unknown as PrismaClient,
      'existing-superadmin@minstocs.com',
    );

    expect(result.success).toBe(true);
    expect(result.membershipId).toBe('mem-existing-super');
    expect(mockPrisma.membership.update).not.toHaveBeenCalled();
  });

  it('7. Existing data is not deleted when bootstrapping user with 0 memberships', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-new',
      email: 'newadmin@minstocs.com',
      memberships: [],
    });

    mockPrisma.organization.findFirst.mockResolvedValue({
      id: 'org-system-admin',
      name: 'System Administration',
      slug: 'system-administration',
      status: MembershipStatus.ACTIVE,
    });

    mockPrisma.membership.create.mockResolvedValue({
      id: 'mem-new-super',
      userId: 'user-uuid-new',
      organizationId: 'org-system-admin',
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    });

    const result = await bootstrapSuperAdmin(
      mockPrisma as unknown as PrismaClient,
      'newadmin@minstocs.com',
    );

    expect(result.success).toBe(true);
    expect(result.membershipId).toBe('mem-new-super');
    expect(mockPrisma.membership.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-uuid-new',
        organizationId: 'org-system-admin',
        role: Role.SUPER_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });
  });

  it('8. Unauthorized users cannot invoke the bootstrap through an HTTP endpoint', () => {
    const controller = new SuperAdminController();
    const prototype = Object.getPrototypeOf(controller);
    const methodNames = Object.getOwnPropertyNames(prototype);

    // Verify SuperAdminController exposes NO bootstrap endpoint
    expect(methodNames).not.toContain('bootstrap');
    expect(methodNames).not.toContain('postBootstrap');
    expect(methodNames).not.toContain('createSuperAdmin');
  });
});
