import { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, AppState } from 'react-native'
import * as Updates from 'expo-updates'
import { addDebugLog } from './DebugPanel'

async function checkAndUpdate() {
  addDebugLog(`__DEV__=${String(__DEV__)}`, 'OTA')
  addDebugLog(`isEnabled=${String(Updates.isEnabled)}`, 'OTA')
  if (!Updates.isEnabled) {
    addDebugLog('skip: Updates.isEnabled=false', 'OTA')
    return
  }
  try {
    addDebugLog('calling checkForUpdateAsync...', 'OTA')
    const result = await Updates.checkForUpdateAsync()
    addDebugLog(`result: isAvailable=${String(result.isAvailable)}`, 'OTA')
    if (result.isAvailable) {
      addDebugLog('fetching update...', 'OTA')
      await Updates.fetchUpdateAsync()
      addDebugLog('reloading...', 'OTA')
      await Updates.reloadAsync()
    }
  } catch (e: any) {
    addDebugLog(`${e?.message ?? String(e)}`, 'ERROR')
  }
}

export function UpdateChecker({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    checkAndUpdate().finally(() => setReady(true))

    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkAndUpdate()
      }
      appState.current = nextState
    })

    return () => sub.remove()
  }, [])

  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: '#0d1f3c', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1.5 }}>
        ARKE<Text style={{ color: '#00eeff' }}>vest</Text>
      </Text>
      <ActivityIndicator color='#00eeff' />
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Verificando atualização...</Text>
    </View>
  )

  return <>{children}</>
}
