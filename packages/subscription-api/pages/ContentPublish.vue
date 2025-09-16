// pages/ContentPublish.vue
<template>
  <div class="content-publish">
    <h1>内容发布</h1>
    
    <!-- 权限检查 -->
    <SubscriptionGuard feature="publish">
      <div class="publish-form">
        <form @submit.prevent="handlePublish">
          <div class="form-group">
            <label>标题</label>
            <input v-model="form.title" type="text" required />
          </div>
          
          <div class="form-group">
            <label>内容</label>
            <textarea v-model="form.content" required></textarea>
          </div>
          
          <div class="form-group">
            <label>发布平台</label>
            <div class="platform-selector">
              <label v-for="platform in platforms" :key="platform.id">
                <input 
                  type="checkbox" 
                  v-model="form.platforms" 
                  :value="platform.id"
                />
                {{ platform.name }}
              </label>
            </div>
          </div>
          
          <button type="submit" :disabled="publishing">
            {{ publishing ? '发布中...' : '发布内容' }}
          </button>
        </form>
        
        <!-- 使用限制提示 -->
        <div v-if="usageInfo" class="usage-info">
          <p>本月已发布: {{ usageInfo.used }}/{{ usageInfo.limit === -1 ? '无限制' : usageInfo.limit }}</p>
          <div v-if="usageInfo.limit > 0" class="progress-bar">
            <div 
              class="progress" 
              :style="{ width: `${(usageInfo.used / usageInfo.limit) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSubscription } from '@/composables/useSubscription'
import SubscriptionGuard from '@/components/SubscriptionGuard.vue'
import { api } from '@/utils/api'

const { subscription } = useSubscription()

const form = ref({
  title: '',
  content: '',
  platforms: []
})

const platforms = ref([
  { id: 'weibo', name: '微博' },
  { id: 'douyin', name: '抖音' },
  { id: 'xiaohongshu', name: '小红书' }
])

const publishing = ref(false)
const usageInfo = ref(null)

onMounted(async () => {
  // 获取使用情况
  try {
    const response = await api.get('/content/usage/publish')
    usageInfo.value = response.data.data
  } catch (err) {
    console.error('获取使用情况失败:', err)
  }
})

const handlePublish = async () => {
  publishing.value = true
  
  try {
    const response = await api.post('/content/publish', form.value)
    
    if (response.data.code === 200) {
      // 发布成功
      alert('内容发布成功！')
      form.value = { title: '', content: '', platforms: [] }
      
      // 刷新使用情况
      const usageResponse = await api.get('/content/usage/publish')
      usageInfo.value = usageResponse.data.data
    }
  } catch (err: any) {
    if (err.response?.status === 403) {
      const errorData = err.response.data
      alert(errorData.message || '权限不足')
    } else {
      alert('发布失败，请稍后重试')
    }
  } finally {
    publishing.value = false
  }
}
</script>
