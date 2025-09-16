// src/migrations/1640000000000-CreateSubscriptionTables.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionTables1640000000000 implements MigrationInterface {
  name = 'CreateSubscriptionTables1640000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建会员订阅表
    await queryRunner.query(`
      CREATE TABLE subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(20) NOT NULL,
        plan_name VARCHAR(50) NOT NULL,
        original_price DECIMAL(10,2) NOT NULL,
        paid_price DECIMAL(10,2) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status INTEGER DEFAULT 1,
        auto_renew BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建会员权限表
    await queryRunner.query(`
      CREATE TABLE subscription_features (
        id SERIAL PRIMARY KEY,
        plan_id VARCHAR(20) NOT NULL,
        feature_key VARCHAR(50) NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建用户权限缓存表
    await queryRunner.query(`
      CREATE TABLE user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permissions JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建通知记录表
    await queryRunner.query(`
      CREATE TABLE notification_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        channel VARCHAR(20) DEFAULT 'email',
        status VARCHAR(20) DEFAULT 'pending',
        reference_id VARCHAR(50),
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await queryRunner.query(`CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date)`);
    await queryRunner.query(`CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id)`);
    await queryRunner.query(`CREATE INDEX idx_user_permissions_user_expires ON user_permissions(user_id, expires_at)`);
    await queryRunner.query(`CREATE INDEX idx_notification_records_user_type ON notification_records(user_id, type)`);
    await queryRunner.query(`CREATE INDEX idx_notification_records_created_at ON notification_records(created_at)`);

    // 添加触发器自动更新 updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_subscriptions_updated_at 
      BEFORE UPDATE ON subscriptions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除触发器
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // 删除索引
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notification_records_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notification_records_user_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_permissions_user_expires`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_subscriptions_plan_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_subscriptions_end_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_subscriptions_user_status`);

    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS notification_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS subscription_features`);
    await queryRunner.query(`DROP TABLE IF EXISTS subscriptions`);
  }
}

// src/seeds/subscription-features.seed.ts
import { DataSource } from 'typeorm';
import { SubscriptionFeature } from '../subscription/entities/subscription-feature.entity';

export async function seedSubscriptionFeatures(dataSource: DataSource) {
  const featureRepository = dataSource.getRepository(SubscriptionFeature);

  const features = [
    // 包月套餐功能
    { planId: 'monthly', featureKey: 'publish', featureName: '内容发布', description: '支持多平台内容发布，每月限制100次' },
    { planId: 'monthly', featureKey: 'aggregate', featureName: '消息聚合', description: '聚合多平台私信和评论' },
    { planId: 'monthly', featureKey: 'customer_support', featureName: '客服支持', description: '标准客服支持' },

    // 包季套餐功能
    { planId: 'quarterly', featureKey: 'publish', featureName: '内容发布', description: '支持多平台内容发布，每月限制500次' },
    { planId: 'quarterly', featureKey: 'aggregate', featureName: '消息聚合', description: '聚合多平台私信和评论' },
    { planId: 'quarterly', featureKey: 'customer_support', featureName: '客服支持', description: '标准客服支持' },
    { planId: 'quarterly', featureKey: 'priority_support', featureName: '优先客服', description: '享受优先客服支持' },

    // 包年套餐功能
    { planId: 'yearly', featureKey: 'publish', featureName: '内容发布', description: '支持多平台内容发布，无次数限制' },
    { planId: 'yearly', featureKey: 'aggregate', featureName: '消息聚合', description: '聚合多平台私信和评论' },
    { planId: 'yearly', featureKey: 'customer_support', featureName: '客服支持', description: '标准客服支持' },
    { planId: 'yearly', featureKey: 'priority_support', featureName: '优先客服', description: '享受优先客服支持' },
    { planId: 'yearly', featureKey: 'vip_group', featureName: 'VIP交流群', description: '加入VIP用户交流群' },
  ];

  for (const feature of features) {
    const existingFeature = await featureRepository.findOne({
      where: { planId: feature.planId, featureKey: feature.featureKey }
    });

    if (!existingFeature) {
      const newFeature = featureRepository.create(feature);
      await featureRepository.save(newFeature);
    }
  }

  console.log('✅ 订阅功能数据初始化完成');
}

// src/database/data-source.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'auth_system'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
});

// src/scripts/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { seedSubscriptionFeatures } from '../seeds/subscription-features.seed';

async function runSeeds() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('🌱 开始数据播种...');
    
    await seedSubscriptionFeatures(dataSource);
    
    console.log('✅ 数据播种完成');
  } catch (error) {
    console.error('❌ 数据播种失败:', error);
  } finally {
    await app.close();
  }
}

runSeeds();