import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../lib/store/auth.store'

export default function AppLayout() {
  const token = useAuthStore(s => s.token)
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  if (!hasHydrated) return null
  if (!token) return <Redirect href="/(auth)/login" />

  return <Stack screenOptions={{ headerShown: false }} />
}
