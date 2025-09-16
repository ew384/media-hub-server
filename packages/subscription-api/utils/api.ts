// utils/api.ts
import axios from 'axios'
import { useAuth } from '@/composables/useAuth'

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000',
  timeout: 10000
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理权限错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const errorData = error.response.data
      
      // 处理权限相关错误
      if (errorData.feature && errorData.suggestedAction) {
        // 显示权限提示弹窗
        showPermissionDialog(errorData)
      }
    } else if (error.response?.status === 401) {
      // token过期，重新登录
      const { logout } = useAuth()
      logout()
    }
    
    return Promise.reject(error)
  }
)

const showPermissionDialog = (errorData: any) => {
  // 这里可以使用 Vue 的全局组件显示权限提示
  console.log('权限不足:', errorData)
}

export { api }
