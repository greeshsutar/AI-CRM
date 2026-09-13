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
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';

@ApiTags('Memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Membership', description: 'Permission: memberships.manage - Connect user to organization with a role' })
  @ApiResponse({ status: 201, description: 'Membership created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden / Cross-tenant access denied' })
  @ApiResponse({ status: 404, description: 'User or Organization not found' })
  @ApiResponse({ status: 409, description: 'Duplicate membership' })
  async create(
    @Body() dto: CreateMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.create(dto, user.userId);
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List Memberships', description: 'Permission: memberships.read - List accessible memberships for user' })
  @ApiResponse({ status: 200, description: 'Memberships retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.findAllForUser(user.userId);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Membership Details', description: 'Permission: memberships.read - Get authorized membership details' })
  @ApiResponse({ status: 200, description: 'Membership retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Membership not found or access denied' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.findByIdForUser(id, user.userId);
  }
}
