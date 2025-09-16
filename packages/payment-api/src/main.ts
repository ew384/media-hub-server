import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS 配置
  app.enableCors({
    origin: [
      'http://localhost:3000',  // admin-dashboard
      'http://localhost:8080',  // 前端应用
      'http://localhost:3001',  // auth-api (如果需要跨服务调用)
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API 文档配置
  const config = new DocumentBuilder()
    .setTitle('Payment API')
    .setDescription('支付系统 API 文档')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: '请输入JWT token',
    })
    .addTag('payment', '支付管理')
    .addTag('orders', '订单管理')
    .addTag('refunds', '退款管理')
    .addServer('http://localhost:3001', '开发环境')
    .addServer(process.env.API_BASE_URL || 'https://api.yourdomain.com', '生产环境')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持授权状态
    },
  });

  // 健康检查端点
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'payment-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 启动服务
  const port = process.env.PAYMENT_PORT || process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Payment API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
  console.log(`🔗 Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start Payment API:', error);
  process.exit(1);
});
