import { supabase } from '../lib/supabaseClient'

const NOTIFICATION_COLUMNS = 'id, recipient_id, urgent_task_id, type, title, message, is_read, created_at'

/**
 * Fetches the signed-in user's UNREAD notifications, most recent first.
 * Once something is marked read (individually or via "mark all as
 * read"), it should disappear from the bell rather than linger in a
 * dimmed state — so this only ever asks the server for is_read = false,
 * the same list the bell renders. RLS (notifications_select_own)
 * separately scopes this to `recipient_id = auth.uid()`.
 */
export async function getNotifications(limit = 30) {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { notifications: data ?? [], error }
}

/** Count of unread notifications for the signed-in user, for the bell badge. */
export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  return { count: count ?? 0, error }
}

/** Marks a single notification read (e.g. when the user opens/clicks it). */
export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return { error }
}

/** Marks every unread notification for the signed-in user read at once. */
export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  return { error }
}
