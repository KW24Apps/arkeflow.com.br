import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type { JwtPayload } from '@arkeflow/shared'
import { loginRequest, logoutRequest } from '../api/auth'

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}

export interface SessaoAtivaInfo {
  ip: string | null
  em: string | null
}

interface AuthStore {
  token: string | null
  usuario: JwtPayload | null
  isLoading: boolean
  sessaoAtiva: SessaoAtivaInfo | null
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (email: string, senha: string, forcar?: boolean) => Promise<void>
  clearSessaoAtiva: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      isLoading: false,
      sessaoAtiva: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, senha, forcar) => {
        set({ isLoading: true })
        try {
          const { token, usuario } = await loginRequest(email, senha, forcar)
          await SecureStore.setItemAsync('arkevest_token', token)
          set({ token, usuario, isLoading: false, sessaoAtiva: null })
        } catch (e: any) {
          set({ isLoading: false })
          if (e?.response?.status === 409 && e?.response?.data?.code === 'SESSAO_ATIVA') {
            set({ sessaoAtiva: { ip: e.response.data.ip ?? null, em: e.response.data.em ?? null } })
            return
          }
          throw e
        }
      },

      clearSessaoAtiva: () => set({ sessaoAtiva: null }),

      logout: async () => {
        try { await logoutRequest() } catch {}
        await SecureStore.deleteItemAsync('arkevest_token').catch(() => {})
        await SecureStore.deleteItemAsync('arkevest_auth').catch(() => {})
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
