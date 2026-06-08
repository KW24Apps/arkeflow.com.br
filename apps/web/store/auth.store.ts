import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JwtPayload } from '@arkeflow/shared'

interface AuthState {
  token: string | null
  usuario: JwtPayload | null
  setAuth: (token: string, usuario: JwtPayload) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      setAuth: (token, usuario) => set({ token, usuario }),
      clearAuth: () => set({ token: null, usuario: null }),
    }),
    { name: 'arkeflow_auth', skipHydration: true }
  )
)
