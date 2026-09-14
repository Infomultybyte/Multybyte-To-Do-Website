/**
 * Shared date helpers for the Staff monthly To-Do grid.
 * All month math is done with plain integers (1-12) rather than JS Date's
 * 0-indexed months, to keep the rest of the app easy to reason about.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Multybyte operates in India, so "today" is defined as today in India
 * Standard Time — not each device's own OS timezone/clock. This keeps
 * every staff laptop (and the Supabase database trigger that also
 * enforces this — see supabase/staff_checkin_date_lock.sql) agreeing on
 * exactly the same "today", regardless of a laptop's local timezone
 * setting. Uses Intl.DateTimeFormat rather than a manual UTC+5:30 offset
 * calculation so it stays correct without relying on any one browser's
 * default timezone.
 */
function getISTDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const map = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = Number(part.value)
  }

  return { year: map.year, month: map.month, day: map.day }
}

/** Returns { month: 1-12, year } for "right now" in India Standard Time. */
export function getCurrentMonthYear() {
  const { year, month } = getISTDateParts()
  return { month, year }
}

/** Returns the number of days in the given month (1-12) of the given year. */
export function getDaysInMonth(month, year) {
  // Day 0 of "next month" is the last day of "this month".
  return new Date(year, month, 0).getDate()
}

/** Returns an array [1, 2, ..., N] for the number of days in month/year. */
export function getDayNumbers(month, year) {
  const days = getDaysInMonth(month, year)
  return Array.from({ length: days }, (_, i) => i + 1)
}

export function getMonthName(month) {
  return MONTH_NAMES[month - 1] || ''
}

export function formatMonthYear(month, year) {
  return `${getMonthName(month)} ${year}`
}

/** Formats a month/day/year as an ISO date string (YYYY-MM-DD) for Supabase `date` columns. */
export function toISODate(year, month, day) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/**
 * Builds a list of selectable months for the dropdown: a window of past
 * months, the current month, and a short window of upcoming months.
 * Future months are included (not hidden) because an admin may assign
 * next month's tasks ahead of time — the grid's own empty state already
 * reads "No tasks assigned for [Month Year]" for any month with nothing
 * in it, so showing a future month costs nothing when it's empty and
 * unblocks it the moment tasks exist. Ordered most-future first.
 */
export function buildMonthOptions(monthsBack = 12, monthsForward = 3) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear()
  const options = []

  for (let i = monthsForward; i >= -monthsBack; i -= 1) {
    let month = curMonth + i
    let year = curYear
    while (month < 1) {
      month += 12
      year -= 1
    }
    while (month > 12) {
      month -= 12
      year += 1
    }
    options.push({ month, year, label: formatMonthYear(month, year) })
  }

  return options
}

/** Returns { year, month, day } for "right now" in India Standard Time. */
export function getTodayIST() {
  return getISTDateParts()
}

/** True if year/month/day is "today" in India Standard Time (see getTodayIST). */
export function isToday(year, month, day) {
  const ist = getISTDateParts()
  return ist.year === year && ist.month === month && ist.day === day
}

/**
 * True if the given calendar date (month is 1-12) falls on a Sunday.
 * This is a plain calendar fact about the date itself (not "now"), so
 * it's computed with Date.UTC rather than getISTDateParts — no
 * timezone-of-"now" involved, just which weekday a given day lands on.
 */
export function isSunday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0
}

/**
 * True if a YYYY-MM-DD deadline string is strictly before "today" in
 * India Standard Time (see getTodayIST) — i.e. the deadline has passed
 * and the task is still open. Plain string comparison works because
 * ISO date strings sort lexicographically the same as chronologically.
 */
export function isPastDeadline(deadlineISO) {
  if (!deadlineISO) return false
  const { year, month, day } = getTodayIST()
  return deadlineISO < toISODate(year, month, day)
}
