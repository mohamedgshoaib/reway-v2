"use client"

import { ensureReady } from "@web-kits/audio"
import { SoundProvider as WebKitsSoundProvider } from "@web-kits/audio/react"
import {
  createContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  getDefaultSoundEnabled,
  getDefaultSoundVolume,
  getSoundEnabled,
  getSoundVolume,
  setSoundEnabled,
  setSoundVolume,
  subscribeToSoundSettings,
} from "@/lib/sound-settings"

type SoundSettingsState = {
  enabled: boolean
  volume: number
  setEnabled: (enabled: boolean) => void
  setVolume: (volume: number) => void
}

const SoundSettingsContext = createContext<SoundSettingsState | undefined>(
  undefined
)

export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(
    subscribeToSoundSettings,
    getSoundEnabled,
    getDefaultSoundEnabled
  )
  const volume = useSyncExternalStore(
    subscribeToSoundSettings,
    getSoundVolume,
    getDefaultSoundVolume
  )

  useEffect(() => {
    const onFirstGesture = () => {
      void ensureReady()
    }
    document.addEventListener("pointerdown", onFirstGesture, { once: true })
    document.addEventListener("keydown", onFirstGesture, { once: true })
    return () => {
      document.removeEventListener("pointerdown", onFirstGesture)
      document.removeEventListener("keydown", onFirstGesture)
    }
  }, [])

  const settings = useMemo(
    () => ({
      enabled,
      volume,
      setEnabled: setSoundEnabled,
      setVolume: setSoundVolume,
    }),
    [enabled, volume]
  )

  return (
    <SoundSettingsContext value={settings}>
      <WebKitsSoundProvider
        enabled={enabled}
        volume={volume}
        onEnabledChange={setSoundEnabled}
        onVolumeChange={setSoundVolume}
      >
        {children}
      </WebKitsSoundProvider>
    </SoundSettingsContext>
  )
}
