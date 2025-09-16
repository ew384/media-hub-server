// src/notification/entities/notification-record.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_records')
export class NotificationRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 50 })
  type: string; // expiry_reminder, subscription_success, etc.

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 20, default: 'email' })
  channel: string; // email, sms, push

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, sent, failed

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string; // 关联ID（如订阅ID）

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}