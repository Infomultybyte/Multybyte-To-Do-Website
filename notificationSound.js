/**
 * Plays a short two-note chime when a new notification arrives, the same
 * general idea as WhatsApp Web's incoming-message sound. Synthesized with
 * the Web Audio API rather than an external audio file, so there's no
 * asset to ship or license.
 *
 * Browsers block audio from starting with no prior interaction on the
 * page at all ("autoplay policy") — by the time any notification can
 * fire here the user has already signed in via a click, which counts.
 */
let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null

  if (!audioCtx) {
    audioCtx = new AudioContextClass()
  }
  // Some browsers create/leave the context 'suspended' until a user
  // gesture resumes it — this keeps trying each call rather than only
  // once, so it recovers the first time it's actually allowed to.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playTone(ctx, frequency, startTime, duration, peakVolume) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/** Short ascending "ding" — two quick notes, A5 then E6, at a level
 * that's clearly audible over normal typing/office noise (not a subtle
 * background blip). */
export function playNotificationSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    playTone(ctx, 880, now, 0.24, 0.55)
    playTone(ctx, 1318.5, now + 0.1, 0.32, 0.6)
  } catch {
    // Never let a sound glitch break the notification itself.
  }
}

const MUTE_STORAGE_KEY = 'multybyte_notification_sound_muted'

/** Whether the signed-in user has turned the notification chime off on this device. */
export function isNotificationSoundMuted() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
}

export function setNotificationSoundMuted(muted) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false')
}
