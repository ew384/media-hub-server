// src/subscription/subscription.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionFeature } from './entities/subscription-feature.entity';
import { SubscriptionStatus } from './constants/subscription.constants';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subscriptionRepository: Repository<Subscription>;
  let featureRepository: Repository<SubscriptionFeature>;

  const mockSubscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockFeatureRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionFeature),
          useValue: mockFeatureRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    subscriptionRepository = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription),
    );
    featureRepository = module.get<Repository<SubscriptionFeature>>(
      getRepositoryToken(SubscriptionFeature),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const userId = 1;
      const createDto = {
        planId: 'monthly',
        paidPrice: 49.9,
        autoRenew: false,
      };

      const expectedSubscription = {
        id: 1,
        userId,
        planId: 'monthly',
        planName: '包月套餐',
        originalPrice: 49.9,
        paidPrice: 49.9,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(null); // 没有现有订阅
      mockSubscriptionRepository.create.mockReturnValue(expectedSubscription);
      mockSubscriptionRepository.save.mockResolvedValue(expectedSubscription);

      const result = await service.createSubscription(userId, createDto);

      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          planId: 'monthly',
          planName: '包月套餐',
          originalPrice: 49.9,
          paidPrice: 49.9,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: false,
        }),
      );
      expect(result).toEqual(expectedSubscription);
    });

    it('should throw error if user already has active subscription', async () => {
      const userId = 1;
      const createDto = {
        planId: 'monthly',
        paidPrice: 49.9,
      };

      const existingSubscription = {
        id: 1,
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);

      await expect(service.createSubscription(userId, createDto)).rejects.toThrow(
        'User already has an active subscription',
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscription status for active user', async () => {
      const userId = 1;
      const activeSubscription = {
        id: 1,
        userId,
        planId: 'yearly',
        planName: '包年套餐',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        isActive: true,
        remainingDays: 200,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(activeSubscription);

      const result = await service.getSubscriptionStatus(userId);

      expect(result.isActive).toBe(true);
      expect(result.planId).toBe('yearly');
      expect(result.permissions).toContain('publish');
      expect(result.permissions).toContain('vip_group');
    });

    it('should return inactive status for user without subscription', async () => {
      const userId = 1;

      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getSubscriptionStatus(userId);

      expect(result.isActive).toBe(false);
      expect(result.planId).toBeNull();
      expect(result.permissions).toHaveLength(0);
    });
  });

  describe('previewSubscription', () => {
    it('should calculate correct preview for quarterly plan', async () => {
      const userId = 1;
      const previewDto = {
        planId: 'quarterly',
      };

      const result = await service.previewSubscription(userId, previewDto);

      expect(result.planId).toBe('quarterly');
      expect(result.originalPrice).toBe(129);
      expect(result.finalPrice).toBeLessThan(129); // 应该有折扣
      expect(result.discount).toBe(13.7);
      expect(result.duration).toBe(3);
      expect(result.unit).toBe('month');
    });
  });
});