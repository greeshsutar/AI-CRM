import { TeamsService } from './teams.service';
import { PrismaService } from '../database';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockPrismaService: any;
  let mockAuditLogsService: any;

  beforeEach(() => {
    mockPrismaService = {
      organization: {
        findUnique: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      membership: {
        findFirst: vi.fn(),
      },
      teamMember: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    mockAuditLogsService = {
      log: vi.fn(),
    };

    service = new TeamsService(
      mockPrismaService as unknown as PrismaService,
      mockAuditLogsService as unknown as AuditLogsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a team and log audit event', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrismaService.team.findUnique.mockResolvedValue(null);
      mockPrismaService.team.create.mockResolvedValue({
        id: 'team-1',
        organizationId: 'org-1',
        name: 'Sales Alpha',
        description: 'Primary Sales Team',
      });

      const result = await service.create(
        { organizationId: 'org-1', name: 'Sales Alpha', description: 'Primary Sales Team' },
        'actor-user-1',
      );

      expect(mockPrismaService.team.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          name: 'Sales Alpha',
          description: 'Primary Sales Team',
        },
      });

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-user-1',
          organizationId: 'org-1',
          action: 'team.created',
          targetResource: 'team:team-1',
        }),
      );

      expect(result.id).toBe('team-1');
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ organizationId: 'org-missing', name: 'Sales' }, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if team name already exists in org', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      mockPrismaService.team.findUnique.mockResolvedValue({ id: 'team-existing' });

      await expect(
        service.create({ organizationId: 'org-1', name: 'Sales' }, 'actor-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllForOrganization', () => {
    it('should return teams for active organization member', async () => {
      mockPrismaService.membership.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockPrismaService.team.findMany.mockResolvedValue([
        { id: 'team-1', name: 'Sales', members: [] },
      ]);

      const teams = await service.findAllForOrganization('org-1', 'user-1');

      expect(teams).toHaveLength(1);
      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
    });

    it('should throw ForbiddenException if user is not active member', async () => {
      mockPrismaService.membership.findFirst.mockResolvedValue(null);

      await expect(service.findAllForOrganization('org-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByIdForUser', () => {
    it('should return team details if user belongs to team organization', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue({
        id: 'team-1',
        organizationId: 'org-1',
        name: 'Sales',
      });
      mockPrismaService.membership.findFirst.mockResolvedValue({ id: 'mem-1' });

      const team = await service.findByIdForUser('team-1', 'user-1');
      expect(team.id).toBe('team-1');
    });

    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.findByIdForUser('team-missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add user to team and log audit event', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue({
        id: 'team-1',
        organizationId: 'org-1',
        name: 'Sales',
      });
      mockPrismaService.membership.findFirst.mockResolvedValue({ id: 'mem-target' });
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null);
      mockPrismaService.teamMember.create.mockResolvedValue({
        id: 'tm-1',
        teamId: 'team-1',
        userId: 'user-target',
      });

      const result = await service.addMember(
        'team-1',
        { userId: 'user-target' },
        'actor-1',
      );

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          organizationId: 'org-1',
          action: 'team.member_added',
          targetResource: 'team_member:tm-1',
        }),
      );

      expect(result.id).toBe('tm-1');
    });

    it('should throw BadRequestException if target user is not in organization', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue({
        id: 'team-1',
        organizationId: 'org-1',
        name: 'Sales',
      });
      mockPrismaService.membership.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember('team-1', { userId: 'user-external' }, 'actor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeMember', () => {
    it('should delete team member and log audit event', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue({
        id: 'team-1',
        organizationId: 'org-1',
        name: 'Sales',
      });
      mockPrismaService.teamMember.findUnique.mockResolvedValue({
        id: 'tm-1',
        teamId: 'team-1',
        userId: 'user-target',
      });
      mockPrismaService.teamMember.delete.mockResolvedValue({ id: 'tm-1' });

      const result = await service.removeMember('team-1', 'user-target', 'actor-1');

      expect(mockPrismaService.teamMember.delete).toHaveBeenCalledWith({
        where: { id: 'tm-1' },
      });
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          organizationId: 'org-1',
          action: 'team.member_removed',
          targetResource: 'team:team-1',
        }),
      );
      expect(result.success).toBe(true);
    });
  });
});
