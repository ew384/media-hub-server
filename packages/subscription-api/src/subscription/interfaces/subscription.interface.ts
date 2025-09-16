// src/subscription/interfaces/subscription.interface.ts

export interface SubscriptionStatusResponse {
  isActive: boolean;
  planId: string | null;
  planName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  remainingDays: number;
  autoRenew: boolean;
  permissions: string[];
  features: Record<string, FeatureStatus>;
}

export interface FeatureStatus {
  enabled: boolean;
  limit?: number;
  usage?: number;
  type?: string;
}

export interface SubscriptionPreview {
  planId: string;
  planName: string;
  originalPrice: number;
  finalPrice: number;
  discount: number;
  startDate: Date;
  endDate: Date;
  duration: number;
  unit: string;
  features: string[];
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  feature: string;
  reason?: string;
  suggestedAction?: 'renew' | 'upgrade' | 'contact';
  expiresAt?: Date;
}

export interface UserPermissions {
  userId: number;
  permissions: string[];
  features: Record<string, FeatureStatus>;
  subscription: {
    isActive: boolean;
    planId: string;
    endDate: Date;
  } | null;
  expiresAt: Date;
}

export interface SubscriptionHistory {
  id: number;
  planId: string;
  planName: string;
  originalPrice: number;
  paidPrice: number;
  startDate: Date;
  endDate: Date;
  status: number;
  createdAt: Date;
}

export interface ExpiringSubscription {
  id: number;
  userId: number;
  planId: string;
  planName: string;
  endDate: Date;
  remainingDays: number;
  userEmail?: string;
  autoRenew: boolean;
}

export interface SubscriptionStats {
  totalActiveSubscriptions: number;
  totalExpiredSubscriptions: number;
  planDistribution: Record<string, number>;
  monthlyRevenue: number;
  expiringInWeek: number;
  autoRenewRate: number;
}