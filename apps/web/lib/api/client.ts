import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
})

// Injeta o token em toda requisição — lê do Zustand persist (chave arkeflow_auth)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('arkeflow_auth')
      const token = raw ? JSON.parse(raw)?.state?.token : null
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {}
  }
  return config
})

// Flag de módulo: garante que apenas um redirect acontece mesmo com múltiplos 401 simultâneos
let redirecting = false

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login') &&
      !redirecting
    ) {
      redirecting = true
      // Limpa a sessão armazenada
      localStorage.removeItem('arkeflow_auth')
      localStorage.removeItem('arkeflow_token')
      document.cookie = 'arkeflow_token=; path=/; max-age=0'
      window.location.href = '/login?expired=1'
    }
    return Promise.reject(error)
  }
)
