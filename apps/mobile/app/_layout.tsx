import { Stack } from 'expo-router'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../lib/store/auth.store'
import { UpdateChecker } from '../components/UpdateChecker'
import { DebugPanel } from '../components/DebugPanel'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync()
  }, [hasHydrated])

  return (
    <UpdateChecker>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <DebugPanel />
    </UpdateChecker>
  )
}
