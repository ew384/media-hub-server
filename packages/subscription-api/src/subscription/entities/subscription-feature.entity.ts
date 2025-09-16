// src/subscription/entities/subscription-feature.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('subscription_features')
export class SubscriptionFeature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'plan_id', length: 20 })
  planId: string;

  @Column({ name: 'feature_key', length: 50 })
  featureKey: string;

  @Column({ name: 'feature_name', length: 100 })
  featureName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}