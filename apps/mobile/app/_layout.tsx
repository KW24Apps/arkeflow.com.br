import { Stack } from 'expo-router'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import * as Updates from 'expo-updates'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../lib/store/auth.store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync()
  }, [hasHydrated])

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync()
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch {
        // ignore in dev / no network
      }
    }
    if (!__DEV__) checkForUpdates()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
