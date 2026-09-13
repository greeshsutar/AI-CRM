import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../database';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockPrisma: {
    organization: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new OrganizationsService(mockPrisma as unknown as PrismaService);
  });

  it('should create an organization when slug is unique', async () => {
    const dto = { name: 'Acme Corp', slug: 'acme-corp' };
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    mockPrisma.organization.create.mockResolvedValue({
      id: 'org-uuid-1',
      ...dto,
      domain: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(dto);
    expect(result.id).toBe('org-uuid-1');
    expect(mockPrisma.organization.create).toHaveBeenCalledWith({
      data: { name: 'Acme Corp', slug: 'acme-corp', domain: null },
    });
  });

  it('should throw ConflictException if organization slug already exists', async () => {
    const dto = { name: 'Acme Corp', slug: 'acme-corp' };
    mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-uuid-existing' });

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('should list organizations accessible to the authenticated user', async () => {
    const userId = 'user-uuid-1';
    const mockOrgs = [{ id: 'org-1', name: 'Org 1' }];
    mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);

    const result = await service.findAllForUser(userId);
    expect(result).toEqual(mockOrgs);
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
      where: { memberships: { some: { userId, status: 'ACTIVE' } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should retrieve authorized organization by ID', async () => {
    const orgId = 'org-uuid-1';
    const userId = 'user-uuid-1';
    const mockOrg = { id: orgId, name: 'Org 1' };
    mockPrisma.organization.findFirst.mockResolvedValue(mockOrg);

    const result = await service.findByIdForUser(orgId, userId);
    expect(result).toEqual(mockOrg);
  });

  it('should throw NotFoundException when retrieving unauthorized or non-existent organization', async () => {
    const orgId = 'org-unauthorized';
    const userId = 'user-uuid-1';
    mockPrisma.organization.findFirst.mockResolvedValue(null);

    await expect(service.findByIdForUser(orgId, userId)).rejects.toThrow(NotFoundException);
  });
});
