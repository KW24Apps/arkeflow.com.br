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
