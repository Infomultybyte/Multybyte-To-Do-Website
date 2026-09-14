/**
 * Wraps the browser's native Notification API. This is what makes a
 * notification visible even when the user is on a DIFFERENT tab, a
 * different window, or a different app entirely — the in-app toast only
 * helps while this tab is the one being looked at, so this covers the
 * rest. Unlike an earlier version of this file, showBrowserNotification
 * no longer checks whether the tab is focused — it always fires once
 * permission is granted, since "pop up no matter which tab/window I'm
 * in" was the whole point.
 */

/** Current permission state, or 'unsupported' if this browser has no Notification API at all. */
export function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/**
 * Prompts the browser's native "Allow notifications?" dialog. Browsers
 * increasingly require this to be called from a direct user gesture
 * (a click) rather than automatically on page load — calling it purely
 * from a mount effect can get silently downgraded to a quiet, easy-to-
 * miss prompt, or skipped outright. Callers should prefer wiring this to
 * an actual button click; a mount-time call is still attempted as a
 * best-effort fallback for browsers that don't require a gesture.
 * Resolves to the resulting permission string.
 */
export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/**
 * Shows a native OS notification for an incoming event. `id` is used to
 * give each notification its own `tag` so a second one never silently
 * replaces/hides the first — without a unique tag, the OS treats same-
 * tag notifications as updates to one another and only the latest stays
 * visible.
 */
export function showBrowserNotification(id, title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon-192x192.png',
      tag: `multybyte-notification-${id}`,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    // Auto-close after a while so these don't pile up forever in the OS
    // notification center — mirrors the in-app toast's own auto-dismiss.
    setTimeout(() => notification.close(), 10000)
  } catch {
    // A handful of browsers/environments support `Notification.permission`
    // but throw on `new Notification()` (older iOS Safari, some in-app
    // webviews). Sound + the in-app toast already covered this event
    // either way.
  }
}
