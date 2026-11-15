import type { IslandId } from './island-ids'
import type { LandingChecks } from './landing'

export type FlyPrompt = 'read' | 'takeoff' | null

export type FlyController = {
  host: HTMLElement
  hideMap: () => void
  showMap: (note: string) => void
  setMapNote: (note: string) => void
  setHudVisible: (visible: boolean) => void
  setTouchVisible: (visible: boolean) => void
  setStatus: (text: string) => void
  setReadout: (text: string) => void
  setHint: (text: string) => void
  setPrompt: (prompt: FlyPrompt) => void
  setChecks: (checks: LandingChecks | null) => void
  isPaused: () => boolean
  keysAllowed: () => boolean
  collectiveAllowed: () => boolean
  openPanel: (id: IslandId, trigger?: HTMLElement | null) => void
  onRead: (handler: () => void) => void
  onTakeoff: (handler: () => void) => void
}
