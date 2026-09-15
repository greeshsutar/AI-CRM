import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '../database';
import { Role } from '@prisma/client';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    organization: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    membership: {
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validOrgId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const requesterId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  let mockAuditLogsService: {
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
      },
      membership: {
        count: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };

    mockAuditLogsService = {
      log: vi.fn().mockResolvedValue({}),
    };

    service = new MembershipsService(
      mockPrisma as unknown as PrismaService,
      mockAuditLogsService as any,
    );
  });

  it('should throw NotFoundException if target user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ userId: validUserId, organizationId: validOrgId }, requesterId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if target organization does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: validUserId });
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ userId: validUserId, organizationId: validOrgId }, requesterId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if requester is not a member of target organization', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: validUserId });
    mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });
    mockPrisma.membership.count.mockResolvedValue(1);
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ userId: validUserId, organizationId: validOrgId }, requesterId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if requester has insufficient permissions (e.g. AGENT)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: validUserId });
    mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });
    mockPrisma.membership.count.mockResolvedValue(1);
    mockPrisma.membership.findFirst.mockResolvedValue({
      userId: requesterId,
      organizationId: validOrgId,
      role: Role.AGENT,
      status: 'ACTIVE',
    });

    await expect(
      service.create({ userId: validUserId, organizationId: validOrgId }, requesterId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ConflictException if duplicate membership exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: validUserId });
    mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });
    mockPrisma.membership.count.mockResolvedValue(0);
    mockPrisma.membership.findUnique.mockResolvedValue({ id: 'existing-mem' });

    await expect(
      service.create({ userId: validUserId, organizationId: validOrgId }, requesterId),
    ).rejects.toThrow(ConflictException);
  });

  it('should create membership successfully when authorized', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: validUserId });
    mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });
    mockPrisma.membership.count.mockResolvedValue(0);
    mockPrisma.membership.findUnique.mockResolvedValue(null);
    const mockCreated = {
      id: 'mem-1',
      userId: validUserId,
      organizationId: validOrgId,
      role: Role.AGENT,
      status: 'ACTIVE',
    };
    mockPrisma.membership.create.mockResolvedValue(mockCreated);

    const result = await service.create({ userId: validUserId, organizationId: validOrgId }, requesterId);
    expect(result).toEqual(mockCreated);
  });

  it('should list memberships for accessible organizations', async () => {
    const mockMemberships = [{ id: 'mem-1' }];
    mockPrisma.membership.findMany.mockResolvedValue(mockMemberships);

    const result = await service.findAllForUser(requesterId);
    expect(result).toEqual(mockMemberships);
  });

  it('should retrieve authorized membership details', async () => {
    const memId = 'mem-uuid-1';
    const mockMem = { id: memId, userId: validUserId };
    mockPrisma.membership.findFirst.mockResolvedValue(mockMem);

    const result = await service.findByIdForUser(memId, requesterId);
    expect(result).toEqual(mockMem);
  });

  it('should throw NotFoundException when attempting to retrieve unauthorized or non-existent membership', async () => {
    const memId = 'mem-unauthorized';
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    await expect(service.findByIdForUser(memId, requesterId)).rejects.toThrow(NotFoundException);
  });
});
