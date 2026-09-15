import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Version,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Employee Invitation',
    description: 'Requires CUSTOMER_ADMIN role in the target organization. Generates a secure single-use token and sends an invitation email.',
  })
  @ApiResponse({ status: 201, description: 'Employee invitation created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or role escalation attempt' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not CUSTOMER_ADMIN of organization)' })
  @ApiResponse({ status: 409, description: 'Conflict (Active member or active invitation exists)' })
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.createInvitation(dto, user);
  }

  @Get('validate/:token')
  @Version('1')
  @ApiOperation({
    summary: 'Validate Invitation Token',
    description: 'Public endpoint to validate an invitation token before employee acceptance.',
  })
  @ApiResponse({ status: 200, description: 'Invitation details retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invitation expired or invalid status' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async validate(@Param('token') token: string) {
    return this.invitationsService.validateInvitationToken(token);
  }

  @Post('accept')
  @Version('1')
  @ApiOperation({
    summary: 'Accept Employee Invitation',
    description: 'Public endpoint. Accepts an employee invitation, synchronizes identity, creates user profile and ACTIVE membership.',
  })
  @ApiResponse({ status: 201, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid, expired, or revoked invitation' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(dto);
  }

  @Get('organization/:organizationId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List Organization Invitations',
    description: 'Requires CUSTOMER_ADMIN role in the specified organization. Returns safe invitation list.',
  })
  @ApiResponse({ status: 200, description: 'Invitations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAllForOrganization(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.findAllForOrganization(organizationId, user);
  }

  @Post(':id/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke Pending Invitation',
    description: 'Requires CUSTOMER_ADMIN role. Revokes a PENDING employee invitation.',
  })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 400, description: 'Only PENDING invitations can be revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revoke(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.revokeInvitation(id, user);
  }
}
