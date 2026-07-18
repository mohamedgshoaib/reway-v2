"use client"

import { ensureReady } from "@web-kits/audio"
import { SoundProvider as WebKitsSoundProvider } from "@web-kits/audio/react"
import { useSyncExternalStore, type ReactNode } from "react"

import { useMountEffect } from "@/hooks/use-mount-effect"
import {
  getDefaultSoundEnabled,
  getDefaultSoundVolume,
  getSoundEnabled,
  getSoundVolume,
  setSoundEnabled,
  setSoundVolume,
  subscribeToSoundSettings,
} from "@/lib/sound-settings"

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

  useMountEffect(() => {
    const removeListeners = () => {
      document.removeEventListener("pointerdown", onFirstGesture)
      document.removeEventListener("keydown", onFirstGesture)
    }
    const onFirstGesture = () => {
      removeListeners()
      void ensureReady()
    }
    document.addEventListener("pointerdown", onFirstGesture)
    document.addEventListener("keydown", onFirstGesture)
    return removeListeners
  })

  return (
    <WebKitsSoundProvider
      enabled={enabled}
      volume={volume}
      onEnabledChange={setSoundEnabled}
      onVolumeChange={setSoundVolume}
    >
      {children}
    </WebKitsSoundProvider>
  )
}
