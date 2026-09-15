import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Version,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../common';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { Role } from '@prisma/client';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Create Team',
    description: 'Permission: teams.manage - Creates a new team in an organization. Requires CUSTOMER_ADMIN or SUPER_ADMIN role.',
  })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict - Team already exists' })
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.create(dto, user.userId);
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List Teams',
    description: 'Lists all teams belonging to an organization for an active member.',
  })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing or invalid organizationId' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a member of the organization' })
  async findAll(
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Query parameter organizationId is required');
    }

    const uuidParser = new ParseUUIDPipe({ version: '4' });
    await uuidParser.transform(organizationId, {
      type: 'query',
      data: 'organizationId',
    });

    return this.teamsService.findAllForOrganization(organizationId, user.userId);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get Team Details',
    description: 'Gets team details by ID for an authorized organization member.',
  })
  @ApiResponse({ status: 200, description: 'Team details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.findByIdForUser(id, user.userId);
  }

  @Post(':id/members')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Add Team Member',
    description: 'Permission: teams.manage - Adds an organization user to a team.',
  })
  @ApiResponse({ status: 201, description: 'Member added to team successfully' })
  @ApiResponse({ status: 400, description: 'User not in organization or invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({ status: 409, description: 'User is already a member of this team' })
  async addMember(
    @Param('id', new ParseUUIDPipe({ version: '4' })) teamId: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.addMember(teamId, dto, user.userId);
  }

  @Delete(':id/members/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Remove Team Member',
    description: 'Permission: teams.manage - Removes a member from a team.',
  })
  @ApiResponse({ status: 200, description: 'Member removed from team successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Team or team member not found' })
  async removeMember(
    @Param('id', new ParseUUIDPipe({ version: '4' })) teamId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.removeMember(teamId, targetUserId, user.userId);
  }
}
