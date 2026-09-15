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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post('onboard')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Onboard Organization Owner',
    description: 'Onboards a new organization owner with company profile, establishing CUSTOMER_ADMIN membership in a transaction.',
  })
  @ApiResponse({ status: 201, description: 'Organization and admin membership onboarded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async onboard(
    @Body() dto: OnboardOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.onboard(dto, user);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Organization', description: 'Permission: organizations.manage' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Organization slug conflict' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.organizationsService.create(dto, user?.userId);
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List Organizations', description: 'Permission: organizations.read - List user accessible organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findAllForUser(user.userId);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Organization Details', description: 'Permission: organizations.read - Get authorized organization details' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization not found or access denied' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.findByIdForUser(id, user.userId);
  }
}
