import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native'

const debugLogs: string[] = []
const subscribers = new Set<(logs: string[]) => void>()

export function addDebugLog(
  message: string,
  category: 'OTA' | 'AUTH' | 'NAV' | 'API' | 'ERROR' = 'OTA'
) {
  const ts = new Date().toISOString().slice(11, 19)
  debugLogs.push(`${ts} [${category}] ${message}`)
  subscribers.forEach(fn => fn([...debugLogs]))
}

function subscribe(fn: (logs: string[]) => void) {
  subscribers.add(fn)
  return () => { subscribers.delete(fn) }
}

function useDebugLogs() {
  const [logs, setLogs] = useState<string[]>([])
  useEffect(() => {
    setLogs([...debugLogs])
    const unsub = subscribe((newLogs) => setLogs(newLogs))
    return unsub
  }, [])
  return [...logs].reverse()
}

export function DebugPanel() {
  const [visible, setVisible] = useState(false)
  const logs = useDebugLogs()

  function clearLogs() {
    debugLogs.length = 0
    subscribers.forEach(fn => fn([]))
  }

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>D</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>DEBUG LOG</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={clearLogs} style={styles.headerBtn}>
                  <Text style={styles.headerBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setVisible(false)} style={styles.headerBtn}>
                  <Text style={styles.headerBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent}>
              {logs.length === 0 ? (
                <Text style={styles.logEmpty}>Nenhum log ainda.</Text>
              ) : (
                logs.map((line, i) => (
                  <Text key={i} style={styles.logLine}>{line}</Text>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fabText: {
    color: '#00eeff',
    fontSize: 14,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#0a1530',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#00eeff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  logScroll: { flex: 1 },
  logContent: { padding: 12, gap: 4 },
  logEmpty: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 16,
  },
  logLine: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 17,
  },
})
