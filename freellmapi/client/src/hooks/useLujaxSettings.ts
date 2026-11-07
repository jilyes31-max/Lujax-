import { useState, useCallback } from 'react'
import {
  loadSettings,
  saveSettings,
  buildSystemPrompts,
  type LujaxSettings,
} from '@/lib/lujax-settings'

export interface UseLujaxSettingsReturn {
  settings: LujaxSettings
  updateSettings: (updates: Partial<LujaxSettings>) => void
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  buildSystemPrompt: () => string[]
}

export function useLujaxSettings(): UseLujaxSettingsReturn {
  const [settings, setSettings] = useState<LujaxSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const updateSettings = useCallback((updates: Partial<LujaxSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      saveSettings(next)
      return next
    })
  }, [])

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const buildSystemPrompt = useCallback(() => {
    return buildSystemPrompts(settings)
  }, [settings])

  return {
    settings,
    updateSettings,
    settingsOpen,
    openSettings,
    closeSettings,
    buildSystemPrompt,
  }
}
