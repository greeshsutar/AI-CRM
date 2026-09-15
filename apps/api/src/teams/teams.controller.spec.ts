import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('TeamsController', () => {
  let controller: TeamsController;
  let mockTeamsService: any;

  const validOrgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validTeamId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const validUserId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(() => {
    mockTeamsService = {
      create: vi.fn(),
      findAllForOrganization: vi.fn(),
      findByIdForUser: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
    };

    controller = new TeamsController(mockTeamsService as unknown as TeamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate team creation to TeamsService', async () => {
      const dto = { organizationId: validOrgId, name: 'Support', description: 'Tier 1 Support' };
      const user = { userId: validUserId, email: 'admin@example.com' };
      mockTeamsService.create.mockResolvedValue({ id: validTeamId, ...dto });

      const result = await controller.create(dto, user);

      expect(mockTeamsService.create).toHaveBeenCalledWith(dto, validUserId);
      expect(result.id).toBe(validTeamId);
    });
  });

  describe('findAll', () => {
    it('should throw BadRequestException if organizationId query parameter is missing', async () => {
      const user = { userId: validUserId, email: 'admin@example.com' };

      await expect(controller.findAll('', user)).rejects.toThrow(BadRequestException);
    });

    it('should delegate fetching teams to TeamsService', async () => {
      const user = { userId: validUserId, email: 'admin@example.com' };
      mockTeamsService.findAllForOrganization.mockResolvedValue([{ id: validTeamId, name: 'Support' }]);

      const result = await controller.findAll(validOrgId, user);

      expect(mockTeamsService.findAllForOrganization).toHaveBeenCalledWith(validOrgId, validUserId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should delegate finding team by ID to TeamsService', async () => {
      const user = { userId: validUserId, email: 'admin@example.com' };
      mockTeamsService.findByIdForUser.mockResolvedValue({ id: validTeamId, name: 'Support' });

      const result = await controller.findOne(validTeamId, user);

      expect(mockTeamsService.findByIdForUser).toHaveBeenCalledWith(validTeamId, validUserId);
      expect(result.id).toBe(validTeamId);
    });
  });

  describe('addMember', () => {
    it('should delegate adding team member to TeamsService', async () => {
      const dto = { userId: validUserId };
      const user = { userId: validUserId, email: 'admin@example.com' };
      mockTeamsService.addMember.mockResolvedValue({ id: 'tm-1', teamId: validTeamId, userId: validUserId });

      const result = await controller.addMember(validTeamId, dto, user);

      expect(mockTeamsService.addMember).toHaveBeenCalledWith(validTeamId, dto, validUserId);
      expect(result.id).toBe('tm-1');
    });
  });

  describe('removeMember', () => {
    it('should delegate removing team member to TeamsService', async () => {
      const user = { userId: validUserId, email: 'admin@example.com' };
      mockTeamsService.removeMember.mockResolvedValue({ success: true });

      const result = await controller.removeMember(validTeamId, validUserId, user);

      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(validTeamId, validUserId, validUserId);
      expect(result.success).toBe(true);
    });
  });
});
