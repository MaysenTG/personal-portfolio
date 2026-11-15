import { emailJs } from '../data/site'
import type { IslandId } from './island-ids'
import type { FlyController, FlyPrompt } from './types'
import type { LandingChecks } from './landing'

/** Keep this local so the fly shell never statically imports the 3D chunk. */
function isIslandId(value: string | undefined): value is IslandId {
  return value === 'projects' || value === 'about' || value === 'skills' || value === 'contact'
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]'

const PROMPT_TEXT: Record<Exclude<FlyPrompt, null>, string> = {
  read: 'Press E to read the sign.',
  takeoff: 'Press F to take off.',
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) throw new Error(`Missing #${id}`)
  return element as T
}

function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text
}

export function initFlyPage(): void {
  const main = requireElement<HTMLElement>('main')
  const host = requireElement<HTMLElement>('fly-view')
  const map = requireElement<HTMLElement>('fly-map')
  const mapNote = requireElement<HTMLElement>('fly-map-note')
  const hud = requireElement<HTMLElement>('fly-hud')
  const touch = requireElement<HTMLElement>('fly-touch')
  const status = requireElement<HTMLElement>('fly-status')
  const readout = requireElement<HTMLElement>('fly-readout')
  const hint = requireElement<HTMLElement>('fly-hint')
  const prompt = requireElement<HTMLElement>('fly-prompt')
  const checks = requireElement<HTMLElement>('fly-checks')
  const dialog = requireElement<HTMLElement>('fly-dialog')
  const readButton = requireElement<HTMLButtonElement>('fly-read')
  const takeoffButton = requireElement<HTMLButtonElement>('fly-takeoff')
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let lastTrigger: HTMLElement | null = null
  let readHandler = () => {}
  let takeoffHandler = () => {}
  let stopFlight = () => {}

  function focusables(): HTMLElement[] {
    return [...main.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
      if (element.closest('[hidden]')) return false
      if (element.getAttribute('aria-hidden') === 'true') return false
      if (element.tabIndex < 0) return false
      if (!dialog.hidden && element.closest('#fly-view, #fly-touch, #fly-hud')) return false
      return true
    })
  }

  function openPanel(id: IslandId, trigger?: HTMLElement | null) {
    const panel = document.getElementById(`panel-${id}`)
    if (!(panel instanceof HTMLElement)) return
    const opener = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    lastTrigger = opener
    for (const section of dialog.querySelectorAll<HTMLElement>('[data-panel]')) {
      section.hidden = section.dataset.panel !== id
    }
    const title = document.getElementById(`panel-${id}-title`)
    if (title) dialog.setAttribute('aria-labelledby', title.id)
    dialog.hidden = false
    main.classList.add('fly--panel')
    if (title instanceof HTMLElement) title.focus()
  }

  function closePanel() {
    if (dialog.hidden) return
    dialog.hidden = true
    main.classList.remove('fly--panel')
    const trigger = lastTrigger
    lastTrigger = null
    trigger?.focus()
  }

  function keysAllowed(): boolean {
    if (!dialog.hidden) return false
    const element = document.activeElement
    if (element instanceof HTMLInputElement) return false
    if (element instanceof HTMLTextAreaElement) return false
    if (element instanceof HTMLSelectElement) return false
    return true
  }

  const api: FlyController = {
    host,
    hideMap: () => {
      map.hidden = true
      host.hidden = false
      hud.hidden = false
    },
    showMap: (note: string) => {
      stopFlight()
      host.hidden = true
      hud.hidden = true
      touch.hidden = true
      map.hidden = false
      setText(mapNote, note)
    },
    setMapNote: (note: string) => {
      setText(mapNote, note)
    },
    setHudVisible: (visible: boolean) => {
      hud.hidden = !visible
    },
    setTouchVisible: (visible: boolean) => {
      touch.hidden = !visible
      main.classList.toggle('fly--touch', visible)
    },
    setStatus: (text: string) => setText(status, text),
    setReadout: (text: string) => {
      readout.hidden = text.length === 0
      setText(readout, text)
    },
    setHint: (text: string) => setText(hint, text),
    setPrompt: (kind: FlyPrompt) => {
      const text = kind ? PROMPT_TEXT[kind] : ''
      prompt.hidden = text.length === 0
      setText(prompt, text)
      readButton.hidden = kind !== 'read'
      takeoffButton.hidden = kind !== 'takeoff'
    },
    setChecks: (next: LandingChecks | null) => {
      checks.hidden = next === null
      if (!next) return
      for (const item of checks.querySelectorAll<HTMLElement>('[data-check]')) {
        const key = item.dataset.check
        const met = key === 'level' ? next.level : key === 'slow' ? next.slow : key === 'low' ? next.low : false
        item.classList.toggle('is-met', met)
      }
    },
    isPaused: () => !dialog.hidden,
    keysAllowed,
    collectiveAllowed: () => {
      if (!keysAllowed()) return false
      const element = document.activeElement
      if (!element) return true
      const tag = element.tagName
      return tag !== 'BUTTON' && tag !== 'A'
    },
    openPanel,
    onRead: (handler) => {
      readHandler = handler
    },
    onTakeoff: (handler) => {
      takeoffHandler = handler
    },
  }

  main.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLElement>('[data-open]')
    if (!button || !main.contains(button)) return
    const id = button.dataset.open
    if (!isIslandId(id)) return
    openPanel(id, button)
  })

  requireElement<HTMLButtonElement>('fly-close').addEventListener('click', () => closePanel())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closePanel()
  })
  readButton.addEventListener('click', () => readHandler())
  takeoffButton.addEventListener('click', () => {
    takeoffHandler()
    takeoffButton.blur()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.hidden) {
      event.preventDefault()
      closePanel()
      return
    }
    if (event.key !== 'Tab' || dialog.hidden) return
    const nodes = focusables()
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })

  bindContactForm()

  if (motion.matches) {
    api.setMapNote('Animation is off, so this is a map of the islands.')
    return
  }

  api.setMapNote('Loading the flight view.')
  void import('./mount').then(({ startFlight }) => {
    if (motion.matches) {
      api.setMapNote('Animation is off, so this is a map of the islands.')
      return
    }
    stopFlight = startFlight(api)
  }).catch((error: unknown) => {
    console.error(error)
    api.showMap('The flight view did not load. The map still opens each section.')
  })

  motion.addEventListener('change', () => {
    if (!motion.matches) return
    api.showMap('Animation is off, so this is a map of the islands.')
  })
}

function bindContactForm() {
  const formEl = document.getElementById('fly-contact-form')
  const submitEl = document.getElementById('fly-contact-submit')
  const errorEl = document.getElementById('fly-contact-error')
  const successEl = document.getElementById('fly-contact-success')
  const nameEl = document.getElementById('fly-name')
  const emailEl = document.getElementById('fly-email')
  const messageEl = document.getElementById('fly-message')
  if (
    !(formEl instanceof HTMLFormElement) ||
    !(submitEl instanceof HTMLButtonElement) ||
    !(errorEl instanceof HTMLElement) ||
    !(successEl instanceof HTMLElement) ||
    !(nameEl instanceof HTMLInputElement) ||
    !(emailEl instanceof HTMLInputElement) ||
    !(messageEl instanceof HTMLTextAreaElement)
  ) {
    return
  }

  const form = formEl
  const submit = submitEl
  const error = errorEl
  const success = successEl
  const nameInput = nameEl
  const emailInput = emailEl
  const messageInput = messageEl

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validationMessage = 'Enter your name, email, and a message.'
  const sendFailureMessage = 'The message did not send. Try again, or email me.'
  let sending = false

  function firstInvalid(): HTMLInputElement | HTMLTextAreaElement | null {
    if (!nameInput.value.trim()) return nameInput
    if (!emailPattern.test(emailInput.value.trim())) return emailInput
    if (!messageInput.value.trim()) return messageInput
    return null
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (sending) return
    const invalid = firstInvalid()
    if (invalid) {
      error.textContent = validationMessage
      error.hidden = false
      invalid.focus()
      return
    }

    sending = true
    error.hidden = true
    submit.disabled = true
    submit.textContent = 'Sending…'

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailJs.service_id,
          template_id: emailJs.template_id,
          user_id: emailJs.user_id,
          template_params: {
            name: nameInput.value,
            email: emailInput.value,
            message: messageInput.value,
          },
        }),
      })
      if (!response.ok) throw new Error(`EmailJS ${response.status}`)
      form.hidden = true
      success.hidden = false
    } catch (err) {
      console.error(err)
      error.textContent = sendFailureMessage
      error.hidden = false
    } finally {
      sending = false
      submit.disabled = false
      submit.textContent = 'Send message'
    }
  })
}
