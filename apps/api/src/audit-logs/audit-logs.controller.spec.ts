import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../database';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let mockAuditLogsService: any;
  let mockPrismaService: any;

  const targetOrgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const otherOrgId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const userId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(() => {
    mockAuditLogsService = {
      findLogsForOrganization: vi.fn(),
    };

    mockPrismaService = {
      membership: {
        findMany: vi.fn(),
      },
    };

    controller = new AuditLogsController(
      mockAuditLogsService as unknown as AuditLogsService,
      mockPrismaService as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should throw BadRequestException if organizationId query parameter is missing', async () => {
    await expect(
      controller.findLogs({ userId, email: 'user@example.com' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow CUSTOMER_ADMIN of target organization to read audit logs', async () => {
    mockPrismaService.membership.findMany.mockResolvedValue([
      {
        userId,
        organizationId: targetOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      },
    ]);

    const mockPaginatedResult = {
      data: [{ id: 'log-1', action: 'organization.created' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    mockAuditLogsService.findLogsForOrganization.mockResolvedValue(mockPaginatedResult);

    const result = await controller.findLogs(
      { userId, email: 'admin@example.com' },
      targetOrgId,
      1,
      20,
    );

    expect(mockAuditLogsService.findLogsForOrganization).toHaveBeenCalledWith(targetOrgId, {
      page: 1,
      limit: 20,
      action: undefined,
    });
    expect(result).toEqual(mockPaginatedResult);
  });

  it('should allow SUPER_ADMIN to read audit logs', async () => {
    mockPrismaService.membership.findMany.mockResolvedValue([
      {
        userId,
        organizationId: 'sys-admin-org',
        role: Role.SUPER_ADMIN,
        status: 'ACTIVE',
      },
    ]);

    const mockPaginatedResult = {
      data: [{ id: 'log-1', action: 'super_admin.bootstrap' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    mockAuditLogsService.findLogsForOrganization.mockResolvedValue(mockPaginatedResult);

    const result = await controller.findLogs(
      { userId, email: 'superadmin@example.com' },
      targetOrgId,
      1,
      20,
    );

    expect(result).toEqual(mockPaginatedResult);
  });

  it('should throw ForbiddenException if user is not a member of target organization (cross-tenant block)', async () => {
    mockPrismaService.membership.findMany.mockResolvedValue([
      {
        userId,
        organizationId: otherOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      },
    ]);

    await expect(
      controller.findLogs({ userId, email: 'user@example.com' }, targetOrgId, 1, 20),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if member has AGENT role (insufficient permissions)', async () => {
    mockPrismaService.membership.findMany.mockResolvedValue([
      {
        userId,
        organizationId: targetOrgId,
        role: Role.AGENT,
        status: 'ACTIVE',
      },
    ]);

    await expect(
      controller.findLogs({ userId, email: 'agent@example.com' }, targetOrgId, 1, 20),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should verify that no POST, PATCH, or DELETE route methods exist on the controller instance', () => {
    const prototype = Object.getPrototypeOf(controller);
    const methodNames = Object.getOwnPropertyNames(prototype);

    expect(methodNames).not.toContain('create');
    expect(methodNames).not.toContain('update');
    expect(methodNames).not.toContain('delete');
    expect(methodNames).not.toContain('remove');
  });
});
