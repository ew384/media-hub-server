import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('系统')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取系统信息' })
  @ApiResponse({
    status: 200,
    description: '系统信息',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Auth API' },
        version: { type: 'string', example: '1.0.0' },
        status: { type: 'string', example: 'running' },
      },
    },
  })
  getHello() {
    return this.appService.getSystemInfo();
  }
}
