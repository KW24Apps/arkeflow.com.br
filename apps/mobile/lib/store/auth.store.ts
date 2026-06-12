import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type { JwtPayload } from '@arkeflow/shared'
import { loginRequest } from '../api/auth'

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}

interface AuthStore {
  token: string | null
  usuario: JwtPayload | null
  isLoading: boolean
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      isLoading: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, senha) => {
        set({ isLoading: true })
        console.log('[AUTH] tentativa:', email, '| senha len:', senha.length)
        try {
          const { token, usuario } = await loginRequest(email, senha)
          console.log('[AUTH] sucesso:', usuario?.email, '| token:', token?.slice(0, 30) + '...')
          await SecureStore.setItemAsync('arkevest_token', token)
          set({ token, usuario, isLoading: false })
        } catch (e: any) {
          console.log('[AUTH] erro status:', e?.response?.status)
          console.log('[AUTH] erro data:', JSON.stringify(e?.response?.data))
          console.log('[AUTH] erro message:', e?.message)
          set({ isLoading: false })
          throw e
        }
      },

      logout: () => {
        SecureStore.deleteItemAsync('arkevest_token').catch(() => {})
        SecureStore.deleteItemAsync('arkevest_auth').catch(() => {})
        set({ token: null, usuario: null })
      },
    }),
    {
      name: 'arkevest_auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
