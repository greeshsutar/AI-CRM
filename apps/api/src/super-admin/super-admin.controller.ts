import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, SuperAdminMfaGuard } from '../auth';

@ApiTags('Super Admin')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminMfaGuard)
export class SuperAdminController {
  @Get('mfa-test')
  @ApiOperation({ summary: 'Test Super Admin MFA requirement' })
  @ApiResponse({ status: 200, description: 'Super Admin MFA verified successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - MFA (AAL2) required for Super Admin' })
  getMfaTest() {
    return {
      success: true,
      message: 'Super Admin MFA verified',
    };
  }
}
