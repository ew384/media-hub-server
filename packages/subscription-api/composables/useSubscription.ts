// composables/useSubscription.ts
import { ref, computed } from 'vue'
import { api } from '@/utils/api'

export interface SubscriptionStatus {
  isActive: boolean
  planId: string | null
  planName: string | null
  endDate: Date | null
  remainingDays: number
  permissions: string[]
  features: Record<string, any>
}

export function useSubscription() {
  const subscription = ref<SubscriptionStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const isVip = computed(() => {
    return subscription.value?.permissions.includes('vip_group') || false
  })

  const canPublish = computed(() => {
    return subscription.value?.permissions.includes('publish') || false
  })

  const isExpiringSoon = computed(() => {
    return subscription.value?.remainingDays && subscription.value.remainingDays <= 7
  })

  // 获取订阅状态
  const fetchSubscriptionStatus = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/subscription/status')
      subscription.value = response.data.data
    } catch (err) {
      error.value = '获取订阅状态失败'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  // 检查权限
  const checkPermission = async (feature: string) => {
    try {
      const response = await api.get(`/permissions/check/${feature}`)
      return response.data.data
    } catch (err) {
      console.error('权限检查失败:', err)
      return { hasPermission: false, reason: '检查失败' }
    }
  }

  // 续费
  const renewSubscription = async (planId: string) => {
    try {
      const response = await api.post('/subscription', { planId })
      await fetchSubscriptionStatus() // 刷新状态
      return response.data
    } catch (err) {
      throw new Error('续费失败')
    }
  }

  return {
    subscription: readonly(subscription),
    loading: readonly(loading),
    error: readonly(error),
    isVip,
    canPublish,
    isExpiringSoon,
    fetchSubscriptionStatus,
    checkPermission,
    renewSubscription
  }
}
