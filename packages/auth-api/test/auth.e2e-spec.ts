import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  const testPhone = '13800138000';
  const testEmail = 'test@example.com';
  const testPassword = 'password123';
  const testUsername = '测试用户';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    // 清理测试数据
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const cleanup = async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.loginAttempt.deleteMany({});
    await prisma.smsCode.deleteMany({});
    await prisma.user.deleteMany({});
  };

  describe('/auth/register (POST)', () => {
    it('should register user with email and password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          type: 'email',
          email: testEmail,
          password: testPassword,
          username: testUsername,
        })
        .expect(201);

      expect(response.body.data.user.email).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail to register with existing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          type: 'email',
          email: testEmail,
          password: testPassword,
          username: '另一个用户',
        })
        .expect(409);
    });

    it('should fail to register with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          type: 'email',
          email: 'invalid-email',
          password: testPassword,
          username: '无效邮箱用户',
        })
        .expect(400);
    });

    it('should fail to register with weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          type: 'email',
          email: 'weak@example.com',
          password: '123',
          username: '弱密码用户',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          type: 'email',
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.data.user.email).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail to login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          type: 'email',
          email: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail to login with non-existing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          type: 'email',
          email: 'nonexisting@example.com',
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.username).toBe(testUsername);
      expect(response.body.data.email).toContain('*');
    });

    it('should fail to get profile without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should fail to get profile with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/profile (PUT)', () => {
    it('should update user profile', async () => {
      const newUsername = '更新后的用户名';
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: newUsername,
          avatarUrl: 'https://example.com/avatar.jpg',
        })
        .expect(200);

      expect(response.body.data.username).toBe(newUsername);
      expect(response.body.data.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should fail to update profile with existing username', async () => {
      // 创建另一个用户
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          type: 'email',
          email: 'another@example.com',
          password: testPassword,
          username: '另一个用户',
        });

      // 尝试使用已存在的用户名更新
      await request(app.getHttpServer())
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: '另一个用户',
        })
        .expect(409);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.accessToken).not.toBe(accessToken);
      
      // 更新token用于后续测试
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail to refresh with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken: refreshToken,
        })
        .expect(204);
    });

    it('should fail to use refresh token after logout', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });
  });

  describe('/sms/send (POST)', () => {
    beforeEach(async () => {
      // 清理之前的短信记录
      await prisma.smsCode.deleteMany({});
    });

    it('should send SMS code successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sms/send')
        .send({
          phone: testPhone,
          scene: 'register',
        })
        .expect(200);

      expect(response.body.data.expireTime).toBe(300);
    });

    it('should fail to send SMS with invalid phone', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sms/send')
        .send({
          phone: '12345',
          scene: 'register',
        })
        .expect(400);
    });

    it('should fail to send SMS with invalid scene', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sms/send')
        .send({
          phone: testPhone,
          scene: 'invalid_scene',
        })
        .expect(400);
    });
  });

  describe('/sms/verify (POST)', () => {
    let testCode: string;

    beforeEach(async () => {
      // 模拟验证码（在实际测试中，您可能需要mock SMS服务）
      testCode = '123456';
      const expiresAt = new Date(Date.now() + 300000); // 5分钟后过期
      
      await prisma.smsCode.create({
        data: {
          phone: testPhone,
          code: testCode,
          scene: 'register',
          expiresAt,
        },
      });
    });

    it('should verify SMS code successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sms/verify')
        .send({
          phone: testPhone,
          code: testCode,
          scene: 'register',
        })
        .expect(200);

      expect(response.body.data.valid).toBe(true);
    });

    it('should fail to verify with wrong code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sms/verify')
        .send({
          phone: testPhone,
          code: '654321',
          scene: 'register',
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
    });

    it('should fail to verify code twice', async () => {
      // 第一次验证
      await request(app.getHttpServer())
        .post('/api/v1/sms/verify')
        .send({
          phone: testPhone,
          code: testCode,
          scene: 'register',
        })
        .expect(200);

      // 第二次验证应该失败
      const response = await request(app.getHttpServer())
        .post('/api/v1/sms/verify')
        .send({
          phone: testPhone,
          code: testCode,
          scene: 'register',
        })
        .expect(200);

      expect(response.body.data.valid).toBe(false);
    });
  });

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.database).toBeDefined();
      expect(response.body.data.redis).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit requests', async () => {
      const requests = [];
      
      // 发送大量请求超过限制
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api/v1/health')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive information in user response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          type: 'email',
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const user = response.body.data.user;
      expect(user.passwordHash).toBeUndefined();
      expect(user.email).toContain('*'); // 应该是脱敏的
    });

    it('should validate input parameters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          type: 'email',
          email: '',
          password: '',
          username: '',
        })
        .expect(400);
    });

    it('should prevent SQL injection', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          type: 'email',
          email: "'; DROP TABLE users; --",
          password: testPassword,
        })
        .expect(401); // 应该返回认证失败而不是服务器错误
    });
  });
});