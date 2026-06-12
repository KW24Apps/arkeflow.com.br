import { Stack } from 'expo-router'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../lib/store/auth.store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync()
  }, [hasHydrated])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
