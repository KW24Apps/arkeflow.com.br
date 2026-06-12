import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'

export const api = axios.create({
  baseURL: 'https://app.arkeflow.com.br/api',
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('arkevest_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

let redirecting = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !redirecting && !error.config?.url?.includes('/auth/login')) {
      redirecting = true
      try {
        await SecureStore.deleteItemAsync('arkevest_token')
        await SecureStore.deleteItemAsync('arkevest_auth')
      } catch {}
      router.replace('/(auth)/login')
      setTimeout(() => { redirecting = false }, 3000)
    }
    return Promise.reject(error)
  }
)
