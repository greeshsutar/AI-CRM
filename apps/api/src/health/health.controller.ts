import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import type { HealthResponse } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Health check', description: 'Returns API health status' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
  })
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
