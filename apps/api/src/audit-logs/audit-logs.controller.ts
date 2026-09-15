import {
  Controller,
  Get,
  Query,
  UseGuards,
  Version,
  ForbiddenException,
  BadRequestException,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../database';
import { Role } from '@prisma/client';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List Audit Logs',
    description:
      'Permission: audit_logs.read - Retrieves tenant-isolated audit logs for an organization. Requires CUSTOMER_ADMIN or SUPER_ADMIN role.',
  })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Target Organization UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by audit action string' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing or invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions or cross-tenant access' })
  async findLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('action') action?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Query parameter organizationId is required');
    }

    // Validate organizationId UUID format
    const uuidParser = new ParseUUIDPipe({ version: '4' });
    await uuidParser.transform(organizationId, {
      type: 'query',
      data: 'organizationId',
    });

    // 1. Verify caller authorization:
    // Must be an active member in organizationId with CUSTOMER_ADMIN or SUPER_ADMIN role,
    // OR have a system-wide active SUPER_ADMIN membership.
    const userMemberships = await this.prisma.membership.findMany({
      where: {
        userId: user.userId,
        status: 'ACTIVE',
      },
    });

    const isGlobalSuperAdmin = userMemberships.some((m) => m.role === Role.SUPER_ADMIN);
    const targetOrgMembership = userMemberships.find((m) => m.organizationId === organizationId);

    if (!isGlobalSuperAdmin) {
      if (!targetOrgMembership) {
        throw new ForbiddenException('Access denied: You are not a member of this organization');
      }

      if (
        targetOrgMembership.role !== Role.CUSTOMER_ADMIN &&
        targetOrgMembership.role !== Role.SUPER_ADMIN
      ) {
        throw new ForbiddenException('Access denied: Insufficient permissions to view organization audit logs');
      }
    }

    return this.auditLogsService.findLogsForOrganization(organizationId, {
      page,
      limit,
      action,
    });
  }
}
