// src/subscription/subscription.controller.spec.ts (集成测试)
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('SubscriptionController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('/subscription/plans (GET)', () => {
    it('should return subscription plans', () => {
      return request(app.getHttpServer())
        .get('/subscription/plans')
        .set('Authorization', `Bearer ${getTestToken()}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.plans).toBeDefined();
          expect(res.body.data.plans).toHaveLength(3);
          expect(res.body.data.plans[0]).toHaveProperty('id');
          expect(res.body.data.plans[0]).toHaveProperty('price');
        });
    });
  });

  describe('/subscription/status (GET)', () => {
    it('should return user subscription status', () => {
      return request(app.getHttpServer())
        .get('/subscription/status')
        .set('Authorization', `Bearer ${getTestToken()}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('isActive');
          expect(res.body.data).toHaveProperty('permissions');
          expect(res.body.data).toHaveProperty('features');
        });
    });
  });

  function getTestToken(): string {
    return jwtService.sign({ 
      sub: 1, 
      email: 'test@example.com',
      role: 'user' 
    });
  }
});