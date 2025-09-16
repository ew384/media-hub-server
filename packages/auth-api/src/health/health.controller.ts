import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({
    status: 200,
    description: '服务健康',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        database: { type: 'string', example: 'connected' },
        redis: { type: 'string', example: 'connected' },
      },
    },
  })
  async check() {
    return this.healthService.check();
  }
}
