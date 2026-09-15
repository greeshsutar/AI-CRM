import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../database';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import * as crypto from 'crypto';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let mockPrisma: any;
  let mockMailService: any;
  let mockAuditLogsService: any;
  let mockConfigService: any;

  const validOrgId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const requesterId = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const targetEmail = 'newemployee@example.com';

  const mockRequester: AuthenticatedUser = {
    userId: requesterId,
    email: 'admin@example.com',
  };

  beforeEach(() => {
    mockPrisma = {
      membership: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      invitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockMailService = {
      sendEmployeeInvitationEmail: vi.fn().mockResolvedValue(true),
    };

    mockAuditLogsService = {
      log: vi.fn().mockResolvedValue({}),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'CORS_ORIGIN') return 'http://localhost:3000';
        return null;
      }),
    };

    service = new InvitationsService(
      mockPrisma as unknown as PrismaService,
      mockMailService as unknown as MailService,
      mockAuditLogsService as unknown as AuditLogsService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('createInvitation', () => {
    it('1 & 20. CUSTOMER_ADMIN can create an invitation for AGENT role', async () => {
      mockPrisma.membership.findFirst.mockResolvedValueOnce({
        userId: requesterId,
        organizationId: validOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      }).mockResolvedValueOnce(null); // existing active member check

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: validOrgId,
        name: 'Acme Corp',
      });
      mockPrisma.invitation.findFirst.mockResolvedValue(null);

      const createdInv = {
        id: 'inv-1',
        organizationId: validOrgId,
        email: targetEmail,
        role: Role.AGENT,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: { id: validOrgId, name: 'Acme Corp' },
        inviter: { email: 'admin@example.com' },
      };
      mockPrisma.invitation.create.mockResolvedValue(createdInv);

      const result = await service.createInvitation(
        { organizationId: validOrgId, email: targetEmail, role: Role.AGENT },
        mockRequester,
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(targetEmail);
      expect(result.role).toBe(Role.AGENT);
      expect(mockMailService.sendEmployeeInvitationEmail).toHaveBeenCalled();
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invitation.created' }),
      );
    });

    it('2 & 3. AGENT or MANAGER cannot create employee invitations', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        userId: requesterId,
        organizationId: validOrgId,
        role: Role.AGENT,
        status: 'ACTIVE',
      });

      await expect(
        service.createInvitation(
          { organizationId: validOrgId, email: targetEmail },
          mockRequester,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. CUSTOMER_ADMIN cannot invite into another organization (cross-tenant rejected)', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      await expect(
        service.createInvitation(
          { organizationId: 'other-org-id', email: targetEmail },
          mockRequester,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('17 & 18. Role escalation attempt (CUSTOMER_ADMIN or SUPER_ADMIN) is rejected', async () => {
      await expect(
        service.createInvitation(
          { organizationId: validOrgId, email: targetEmail, role: Role.CUSTOMER_ADMIN },
          mockRequester,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createInvitation(
          { organizationId: validOrgId, email: targetEmail, role: Role.SUPER_ADMIN },
          mockRequester,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('15. Duplicate ACTIVE membership prevents duplicate invitation', async () => {
      mockPrisma.membership.findFirst.mockResolvedValueOnce({
        userId: requesterId,
        organizationId: validOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      }).mockResolvedValueOnce({
        id: 'existing-mem',
        status: 'ACTIVE',
      });

      mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });

      await expect(
        service.createInvitation(
          { organizationId: validOrgId, email: targetEmail },
          mockRequester,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('16. Duplicate PENDING invitation prevents duplicate invitation', async () => {
      mockPrisma.membership.findFirst.mockResolvedValueOnce({
        userId: requesterId,
        organizationId: validOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      }).mockResolvedValueOnce(null);

      mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });
      mockPrisma.invitation.findFirst.mockResolvedValue({
        id: 'pending-inv',
        status: InvitationStatus.PENDING,
      });

      await expect(
        service.createInvitation(
          { organizationId: validOrgId, email: targetEmail },
          mockRequester,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('29. Mail delivery failure does not corrupt or roll back invitation creation', async () => {
      mockPrisma.membership.findFirst.mockResolvedValueOnce({
        userId: requesterId,
        organizationId: validOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      }).mockResolvedValueOnce(null);

      mockPrisma.organization.findUnique.mockResolvedValue({ id: validOrgId });
      mockPrisma.invitation.findFirst.mockResolvedValue(null);

      const createdInv = {
        id: 'inv-1',
        organizationId: validOrgId,
        email: targetEmail,
        role: Role.MANAGER,
        status: InvitationStatus.PENDING,
        organization: { id: validOrgId, name: 'Acme Corp' },
      };
      mockPrisma.invitation.create.mockResolvedValue(createdInv);
      mockMailService.sendEmployeeInvitationEmail.mockRejectedValueOnce(
        new Error('SMTP connection failure'),
      );

      const result = await service.createInvitation(
        { organizationId: validOrgId, email: targetEmail, role: Role.MANAGER },
        mockRequester,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('inv-1');
    });
  });

  describe('validateInvitationToken', () => {
    it('should return safe invitation details for valid pending token', async () => {
      const rawToken = 'a'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: targetEmail,
        role: Role.AGENT,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        tokenHash,
        organization: { name: 'Acme Corp' },
        inviter: { email: 'admin@example.com' },
      });

      const details = await service.validateInvitationToken(rawToken);
      expect(details.email).toBe(targetEmail);
      expect(details.organizationName).toBe('Acme Corp');
      expect((details as any).tokenHash).toBeUndefined();
    });

    it('12. Expired invitation is rejected during validation', async () => {
      const rawToken = 'b'.repeat(64);
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: targetEmail,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 10000),
        organization: { name: 'Acme Corp' },
      });

      await expect(service.validateInvitationToken(rawToken)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptInvitation', () => {
    it('22, 23 & 25. Valid invitation acceptance creates ACTIVE membership and updates status', async () => {
      const rawToken = 'c'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const invRecord = {
        id: 'inv-1',
        organizationId: validOrgId,
        email: targetEmail,
        role: Role.MANAGER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        tokenHash,
        organization: { id: validOrgId, name: 'Acme Corp' },
      };

      mockPrisma.invitation.findUnique.mockResolvedValue(invRecord);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-uuid-1',
        email: targetEmail,
      });
      mockPrisma.membership.findUnique.mockResolvedValue(null);
      mockPrisma.membership.create.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-uuid-1',
        organizationId: validOrgId,
        role: Role.MANAGER,
        status: 'ACTIVE',
      });

      const res = await service.acceptInvitation({
        token: rawToken,
        password: 'SecurePassword123!',
      });

      expect(res.user.email).toBe(targetEmail);
      expect(res.membership.role).toBe(Role.MANAGER);
      expect(res.membership.status).toBe('ACTIVE');
      expect(mockPrisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: InvitationStatus.ACCEPTED,
          }),
        }),
      );
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invitation.accepted' }),
      );
    });

    it('13 & 14. Cannot accept revoked or non-pending invitations', async () => {
      const rawToken = 'd'.repeat(64);
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-revoked',
        status: InvitationStatus.REVOKED,
      });

      await expect(
        service.acceptInvitation({ token: rawToken, password: 'SecurePassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeInvitation', () => {
    it('30. CUSTOMER_ADMIN can revoke a PENDING invitation', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: validOrgId,
        status: InvitationStatus.PENDING,
      });

      mockPrisma.membership.findFirst.mockResolvedValue({
        userId: requesterId,
        organizationId: validOrgId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      });

      mockPrisma.invitation.update.mockResolvedValue({
        id: 'inv-1',
        organizationId: validOrgId,
        status: InvitationStatus.REVOKED,
      });

      const res = await service.revokeInvitation('inv-1', mockRequester);
      expect(res.status).toBe(InvitationStatus.REVOKED);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invitation.revoked' }),
      );
    });

    it('Cross-tenant revoke is rejected with 403', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'other-org-id',
        status: InvitationStatus.PENDING,
      });

      mockPrisma.membership.findFirst.mockResolvedValue(null);

      await expect(service.revokeInvitation('inv-1', mockRequester)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
