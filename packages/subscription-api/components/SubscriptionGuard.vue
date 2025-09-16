// components/SubscriptionGuard.vue
<template>
  <div>
    <!-- 有权限时显示内容 -->
    <slot v-if="hasPermission" />
    
    <!-- 无权限时显示提示 -->
    <div v-else class="permission-denied">
      <div class="alert alert-warning">
        <h4>{{ permissionResult?.reason || '权限不足' }}</h4>
        <div class="actions">
          <button 
            v-if="permissionResult?.suggestedAction === 'renew'"
            @click="handleRenew"
            class="btn btn-primary"
          >
            立即续费
          </button>
          <button 
            v-else-if="permissionResult?.suggestedAction === 'upgrade'"
            @click="handleUpgrade"
            class="btn btn-success"
          >
            升级套餐
          </button>
          <button 
            v-else
            @click="handleContact"
            class="btn btn-secondary"
          >
            联系客服
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSubscription } from '@/composables/useSubscription'
import { useRouter } from 'vue-router'

interface Props {
  feature: string
  fallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fallback: true
})

const router = useRouter()
const { checkPermission } = useSubscription()

const permissionResult = ref<any>(null)
const loading = ref(true)

const hasPermission = computed(() => {
  return permissionResult.value?.hasPermission || false
})

onMounted(async () => {
  try {
    permissionResult.value = await checkPermission(props.feature)
  } finally {
    loading.value = false
  }
})

const handleRenew = () => {
  router.push('/subscription/renew')
}

const handleUpgrade = () => {
  router.push('/subscription/upgrade')
}

const handleContact = () => {
  router.push('/contact')
}
</script>
