// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // CORS配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // API文档配置
  const config = new DocumentBuilder()
    .setTitle('自媒体多账号管理系统 - 会员订阅API')
    .setDescription('会员订阅系统API文档，包含订阅管理、权限控制等功能')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('subscription', '订阅管理')
    .addTag('permissions', '权限管理')
    .addTag('admin', '管理员功能')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 启动服务
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  logger.log(`🚀 应用启动成功！`);
  logger.log(`📖 API文档地址: http://localhost:${port}/api/docs`);
  logger.log(`🌐 应用地址: http://localhost:${port}`);
}

bootstrap();