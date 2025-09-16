// src/permissions/permissions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { UserPermission } from './entities/user-permission.entity';
import { SubscriptionService } from '../subscription/subscription.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let cacheManager: any;
  let subscriptionService: SubscriptionService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockSubscriptionService = {
    getSubscriptionStatus: jest.fn(),
  };

  const mockPermissionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: getRepositoryToken(UserPermission),
          useValue: mockPermissionRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    cacheManager = module.get(CACHE_MANAGER);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('checkPermission', () => {
    it('should return true for valid permission', async () => {
      const userId = 1;
      const featureKey = 'publish';

      const mockUserPermissions = {
        userId,
        permissions: ['publish', 'aggregate'],
        features: {
          publish: { enabled: true, limit: -1 },
        },
        subscription: {
          isActive: true,
          planId: 'yearly',
          endDate: new Date('2025-01-01'),
        },
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      };

      mockCacheManager.get.mockResolvedValue(mockUserPermissions);

      const result = await service.checkPermission(userId, featureKey);

      expect(result.hasPermission).toBe(true);
      expect(result.feature).toBe(featureKey);
    });

    it('should return false for expired subscription', async () => {
      const userId = 1;
      const featureKey = 'publish';

      const mockUserPermissions = {
        userId,
        permissions: [],
        features: {},
        subscription: null,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      };

      mockCacheManager.get.mockResolvedValue(mockUserPermissions);

      const result = await service.checkPermission(userId, featureKey);

      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('会员已过期');
      expect(result.suggestedAction).toBe('renew');
    });

    it('should return false for insufficient plan', async () => {
      const userId = 1;
      const featureKey = 'vip_group';

      const mockUserPermissions = {
        userId,
        permissions: ['publish', 'aggregate'], // 没有vip_group权限
        features: {
          publish: { enabled: true },
          aggregate: { enabled: true },
        },
        subscription: {
          isActive: true,
          planId: 'monthly',
          endDate: new Date('2025-01-01'),
        },
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      };

      mockCacheManager.get.mockResolvedValue(mockUserPermissions);

      const result = await service.checkPermission(userId, featureKey);

      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('当前套餐不支持此功能');
      expect(result.suggestedAction).toBe('upgrade');
    });
  });

  describe('refreshUserPermissions', () => {
    it('should refresh and cache user permissions', async () => {
      const userId = 1;
      const mockSubscriptionStatus = {
        isActive: true,
        planId: 'yearly',
        planName: '包年套餐',
        permissions: ['publish', 'aggregate', 'vip_group'],
        features: {
          publish: { enabled: true, limit: -1 },
          aggregate: { enabled: true },
          vip_group: { enabled: true },
        },
        endDate: new Date('2025-01-01'),
      };

      mockSubscriptionService.getSubscriptionStatus.mockResolvedValue(mockSubscriptionStatus);
      mockPermissionRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.create.mockReturnValue({});
      mockPermissionRepository.save.mockResolvedValue({});

      const result = await service.refreshUserPermissions(userId);

      expect(result.userId).toBe(userId);
      expect(result.permissions).toEqual(mockSubscriptionStatus.permissions);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});