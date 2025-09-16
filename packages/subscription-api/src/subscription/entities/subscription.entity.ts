// src/subscription/entities/subscription.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'plan_id', length: 20 })
  planId: string;

  @Column({ name: 'plan_name', length: 50 })
  planName: string;

  @Column({ name: 'original_price', type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number;

  @Column({ name: 'paid_price', type: 'decimal', precision: 10, scale: 2 })
  paidPrice: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ default: 1 })
  status: number; // 1:有效 0:过期 -1:取消 2:暂停

  @Column({ name: 'auto_renew', default: false })
  autoRenew: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 虚拟属性
  get isActive(): boolean {
    return this.status === 1 && this.endDate > new Date();
  }

  get remainingDays(): number {
    if (!this.isActive) return 0;
    const diff = this.endDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}