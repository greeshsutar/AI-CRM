import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { Team, TeamMember } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Create a new Team in an Organization (permission: teams.manage)
   */
  async create(dto: CreateTeamDto, actorId: string): Promise<Team> {
    // 1. Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID '${dto.organizationId}' not found`);
    }

    // 2. Check for duplicate team name in organization
    const existing = await this.prisma.team.findUnique({
      where: {
        organizationId_name: {
          organizationId: dto.organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Team '${dto.name}' already exists in this organization`);
    }

    // 3. Create team
    const team = await this.prisma.team.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description ?? null,
      },
    });

    // 4. Log audit event
    await this.auditLogsService.log({
      actorId,
      organizationId: team.organizationId,
      action: 'team.created',
      targetResource: `team:${team.id}`,
      metadata: { name: team.name, description: team.description },
    });

    return team;
  }

  /**
   * List teams belonging to an organization for an authorized member
   */
  async findAllForOrganization(organizationId: string, userId: string): Promise<Team[]> {
    // Verify membership
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: You are not an active member of this organization');
    }

    return this.prisma.team.findMany({
      where: { organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get team details by ID
   */
  async findByIdForUser(id: string, userId: string): Promise<Team> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID '${id}' not found`);
    }

    // Verify membership in team's organization
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId: team.organizationId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: You are not an active member of this organization');
    }

    return team;
  }

  /**
   * Add a member to a Team
   */
  async addMember(teamId: string, dto: AddTeamMemberDto, actorId: string): Promise<TeamMember> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID '${teamId}' not found`);
    }

    // Verify target user is a member of the organization
    const targetMembership = await this.prisma.membership.findFirst({
      where: {
        userId: dto.userId,
        organizationId: team.organizationId,
        status: 'ACTIVE',
      },
    });

    if (!targetMembership) {
      throw new BadRequestException(
        `User '${dto.userId}' must be an active member of organization '${team.organizationId}' before joining team`,
      );
    }

    // Check duplicate team membership
    const existingTeamMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: dto.userId,
        },
      },
    });

    if (existingTeamMember) {
      throw new ConflictException(`User is already a member of team '${team.name}'`);
    }

    const teamMember = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
      },
      include: {
        user: true,
        team: true,
      },
    });

    await this.auditLogsService.log({
      actorId,
      organizationId: team.organizationId,
      action: 'team.member_added',
      targetResource: `team_member:${teamMember.id}`,
      metadata: {
        teamId,
        teamName: team.name,
        targetUserId: dto.userId,
      },
    });

    return teamMember;
  }

  /**
   * Remove a member from a Team
   */
  async removeMember(teamId: string, targetUserId: string, actorId: string): Promise<{ success: boolean }> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID '${teamId}' not found`);
    }

    const existingTeamMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    if (!existingTeamMember) {
      throw new NotFoundException(`User '${targetUserId}' is not a member of team '${team.name}'`);
    }

    await this.prisma.teamMember.delete({
      where: { id: existingTeamMember.id },
    });

    await this.auditLogsService.log({
      actorId,
      organizationId: team.organizationId,
      action: 'team.member_removed',
      targetResource: `team:${teamId}`,
      metadata: {
        teamId,
        teamName: team.name,
        removedUserId: targetUserId,
      },
    });

    return { success: true };
  }
}
