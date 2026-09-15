import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../database';
import { Role } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockPrisma: any;
  let mockAuditLogsService: {
    log: ReturnType<typeof vi.fn>;
  };
  let mockMailService: {
    sendOnboardingEmail: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      membership: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      user: {
        upsert: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    mockAuditLogsService = {
      log: vi.fn().mockResolvedValue({}),
    };

    mockMailService = {
      sendOnboardingEmail: vi.fn().mockResolvedValue(true),
    };

    service = new OrganizationsService(
      mockPrisma as unknown as PrismaService,
      mockAuditLogsService as any,
      mockMailService as any,
    );
  });

  describe('create', () => {
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
  });

  describe('onboard', () => {
    it('should onboard organization owner with CUSTOMER_ADMIN role, log audit events, and send onboarding email', async () => {
      const dto = {
        companyName: 'Acme Global',
        numberOfUsers: 25,
        phone: '+15551234567',
        firstName: 'Jane',
        lastName: 'Doe',
      };
      const user = { userId: 'user-uuid-1', email: 'jane@acme.com' };

      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const mockUserProfile = { id: user.userId, email: user.email, firstName: 'Jane', lastName: 'Doe', phone: '+15551234567' };
      const mockCreatedOrg = { id: 'org-uuid-1', name: 'Acme Global', slug: 'acme-global', numberOfUsers: 25, status: 'ACTIVE' };
      const mockCreatedMem = { id: 'mem-uuid-1', userId: user.userId, organizationId: 'org-uuid-1', role: Role.CUSTOMER_ADMIN, status: 'ACTIVE' };

      mockPrisma.user.upsert.mockResolvedValue(mockUserProfile);
      mockPrisma.organization.create.mockResolvedValue(mockCreatedOrg);
      mockPrisma.membership.create.mockResolvedValue(mockCreatedMem);

      const result = await service.onboard(dto, user);

      expect(mockPrisma.user.upsert).toHaveBeenCalled();
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme Global',
          slug: 'acme-global',
          domain: null,
          numberOfUsers: 25,
          status: 'ACTIVE',
        },
      });
      expect(mockPrisma.membership.create).toHaveBeenCalledWith({
        data: {
          userId: user.userId,
          organizationId: 'org-uuid-1',
          role: Role.CUSTOMER_ADMIN,
          status: 'ACTIVE',
        },
      });

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.created', organizationId: 'org-uuid-1' }),
      );
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'membership.created', organizationId: 'org-uuid-1' }),
      );

      expect(mockMailService.sendOnboardingEmail).toHaveBeenCalledWith({
        to: 'jane@acme.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+15551234567',
        email: 'jane@acme.com',
        companyName: 'Acme Global',
        numberOfUsers: 25,
      });

      expect(result.organization).toEqual(mockCreatedOrg);
      expect(result.membership).toEqual(mockCreatedMem);
    });

    it('should complete onboarding successfully even if email delivery throws an exception', async () => {
      const dto = {
        companyName: 'Acme Resilient',
        numberOfUsers: 10,
      };
      const user = { userId: 'user-uuid-2', email: 'owner@acme.com' };

      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const mockUserProfile = { id: user.userId, email: user.email };
      const mockCreatedOrg = { id: 'org-uuid-2', name: 'Acme Resilient', slug: 'acme-resilient', numberOfUsers: 10, status: 'ACTIVE' };
      const mockCreatedMem = { id: 'mem-uuid-2', userId: user.userId, organizationId: 'org-uuid-2', role: Role.CUSTOMER_ADMIN, status: 'ACTIVE' };

      mockPrisma.user.upsert.mockResolvedValue(mockUserProfile);
      mockPrisma.organization.create.mockResolvedValue(mockCreatedOrg);
      mockPrisma.membership.create.mockResolvedValue(mockCreatedMem);

      // Simulate SMTP failure
      mockMailService.sendOnboardingEmail.mockRejectedValue(new Error('SMTP server timeout'));

      const result = await service.onboard(dto, user);

      expect(result.organization).toEqual(mockCreatedOrg);
      expect(result.membership).toEqual(mockCreatedMem);
    });

    it('should return existing organization if owner already onboarded (idempotent submission)', async () => {
      const dto = { companyName: 'Acme Global' };
      const user = { userId: 'user-uuid-1', email: 'jane@acme.com' };

      const existingOrg = { id: 'org-uuid-1', name: 'Acme Global', slug: 'acme-global' };
      const existingMem = { id: 'mem-uuid-1', userId: user.userId, organizationId: 'org-uuid-1', role: Role.CUSTOMER_ADMIN, organization: existingOrg };

      mockPrisma.membership.findFirst.mockResolvedValue(existingMem);

      const result = await service.onboard(dto, user);

      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
      expect(result.organization).toEqual(existingOrg);
    });
  });

  describe('findAllForUser', () => {
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
  });

  describe('findByIdForUser', () => {
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
});
