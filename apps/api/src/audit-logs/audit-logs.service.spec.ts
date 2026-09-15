import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../database';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let mockPrismaService: any;

  beforeEach(() => {
    mockPrismaService = {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new AuditLogsService(mockPrismaService as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeMetadata', () => {
    it('should strip sensitive fields (password, token, refreshToken, totpSecret, credentials)', () => {
      const originalMetadata = {
        email: 'user@example.com',
        password: 'SecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        accessToken: 'access123',
        refreshToken: 'refresh123',
        totpSecret: 'JBSWY3DPEHPK3PXP',
        credentials: { secretKey: 'mySecretKey' },
        safeField: 'harmlessValue',
      };

      const sanitized = service.sanitizeMetadata(originalMetadata);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.totpSecret).toBe('[REDACTED]');
      expect(sanitized.credentials).toBe('[REDACTED]');
      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.safeField).toBe('harmlessValue');
    });

    it('should handle nested metadata objects and arrays without mutating original input', () => {
      const originalMetadata = {
        user: {
          id: '123',
          password: 'SecretPassword123!',
        },
        items: [{ token: 'abc' }, { normal: 'def' }],
      };

      const copyBeforeSanitization = JSON.parse(JSON.stringify(originalMetadata));
      const sanitized = service.sanitizeMetadata(originalMetadata);

      expect(originalMetadata).toEqual(copyBeforeSanitization);
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.id).toBe('123');
      expect(sanitized.items[0].token).toBe('[REDACTED]');
      expect(sanitized.items[1].normal).toBe('def');
    });
  });

  describe('log', () => {
    it('should create an append-only audit log with sanitized metadata', async () => {
      const mockCreated = {
        id: 'log-uuid-1',
        actorId: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        action: 'organization.created',
        targetResource: 'organization:org-uuid-1',
        metadata: { name: 'Acme Corp' },
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockCreated);

      const result = await service.log({
        actorId: 'user-uuid-1',
        organizationId: 'org-uuid-1',
        action: 'organization.created',
        targetResource: 'organization:org-uuid-1',
        metadata: { name: 'Acme Corp', password: 'ShouldBeStripped' },
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-uuid-1',
          organizationId: 'org-uuid-1',
          action: 'organization.created',
          targetResource: 'organization:org-uuid-1',
          metadata: expect.objectContaining({
            name: 'Acme Corp',
            password: '[REDACTED]',
          }),
        }),
      });

      expect(result).toEqual(mockCreated);
    });
  });

  describe('findLogsForOrganization', () => {
    it('should return paginated audit logs for a specific organization', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          organizationId: 'org-1',
          action: 'membership.created',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.count.mockResolvedValue(1);
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findLogsForOrganization('org-1', {
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          skip: 0,
          take: 20,
        }),
      );

      expect(result.data).toEqual(mockLogs);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });
});
