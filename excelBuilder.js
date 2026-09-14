import * as XLSX from 'xlsx'
import { getDayNumbers, getMonthName, toISODate } from './dateUtils'

const DETAIL_HEADERS = [
  'Staff Name',
  'Email',
  'Department',
  'Month',
  'Year',
  'Task Position',
  'Task Name',
  'Date',
  'Completed',
  'Completion Date',
]

const SUMMARY_HEADERS = ['Staff', 'Total Tasks', 'Completed', 'Incomplete', 'Completion %']

/**
 * Builds one row per task per calendar day, for every staff member and
 * every month/year pair the export covers. This is real Supabase data
 * only — `tasksByPair`/`completionsByPair` come straight from
 * exportService, and a staff member with no tasks that month simply
 * contributes no rows (never a fabricated "0 tasks" placeholder row).
 *
 * `tasksByPair` / `completionsByPair` are keyed by `${month}-${year}`,
 * each holding the flat array exportService returned for that one
 * month across every staff member being exported.
 */
export function buildDetailRows({ staffList, monthYearPairs, tasksByPair, completionsByPair }) {
  const rows = []

  for (const { month, year } of monthYearPairs) {
    const key = `${month}-${year}`
    const tasks = tasksByPair[key] || []
    const completions = completionsByPair[key] || []
    const monthName = getMonthName(month)
    const days = getDayNumbers(month, year)

    const completionIndex = new Map()
    for (const c of completions) {
      completionIndex.set(`${c.task_id}::${c.completion_date}`, c)
    }

    const tasksByStaffId = new Map()
    for (const t of tasks) {
      if (!tasksByStaffId.has(t.staff_id)) tasksByStaffId.set(t.staff_id, [])
      tasksByStaffId.get(t.staff_id).push(t)
    }
    for (const list of tasksByStaffId.values()) {
      list.sort((a, b) => a.position - b.position)
    }

    // Iterate staffList (not the task map's own keys) so the sheet's
    // staff ordering always matches the Reports page's own ordering.
    for (const staff of staffList) {
      const staffTasks = tasksByStaffId.get(staff.id) || []

      for (const task of staffTasks) {
        for (const day of days) {
          const dateISO = toISODate(year, month, day)
          const completion = completionIndex.get(`${task.id}::${dateISO}`)
          const isCompleted = Boolean(completion?.completed)

          rows.push({
            'Staff Name': staff.full_name,
            Email: staff.email,
            Department: staff.department || '',
            Month: monthName,
            Year: year,
            'Task Position': task.position,
            'Task Name': task.task_name,
            Date: dateISO,
            Completed: isCompleted ? 'Yes' : 'No',
            'Completion Date':
              isCompleted && completion.completed_at
                ? new Date(completion.completed_at).toLocaleString()
                : '',
          })
        }
      }
    }
  }

  return rows
}

/**
 * One row per staff member, aggregated across every month/year pair
 * the export covers — mirrors the Reports page's own "Total possible
 * task-days" / "Completed task-days" / "Incomplete task-days"
 * definitions (see useAdminReports), just summed over however many
 * months were selected for export instead of exactly one.
 */
export function buildSummaryRows({ staffList, monthYearPairs, tasksByPair, completionsByPair }) {
  return staffList.map((staff) => {
    let totalTasks = 0
    let totalTaskDays = 0
    let completedTaskDays = 0

    for (const { month, year } of monthYearPairs) {
      const key = `${month}-${year}`
      const daysInMonth = getDayNumbers(month, year).length
      const staffTasks = (tasksByPair[key] || []).filter((t) => t.staff_id === staff.id)
      const staffTaskIds = new Set(staffTasks.map((t) => t.id))

      totalTasks += staffTasks.length
      totalTaskDays += staffTasks.length * daysInMonth

      for (const c of completionsByPair[key] || []) {
        if (c.completed && c.staff_id === staff.id && staffTaskIds.has(c.task_id)) {
          completedTaskDays += 1
        }
      }
    }

    const incompleteTaskDays = totalTaskDays - completedTaskDays
    const pct = totalTaskDays > 0 ? Math.round((completedTaskDays / totalTaskDays) * 100) : null

    return {
      Staff: staff.full_name,
      'Total Tasks': totalTasks,
      Completed: completedTaskDays,
      Incomplete: incompleteTaskDays,
      'Completion %': pct !== null ? `${pct}%` : 'N/A',
    }
  })
}

/**
 * Builds a two-sheet workbook (Detail + Summary) and hands it to
 * XLSX.writeFile, which triggers a normal browser download — no
 * server round trip, no service-role key of any kind involved; the
 * data was already fetched client-side through the signed-in admin's
 * own session (see useReportExport). Headers are always written via
 * the `header` option even when a sheet has zero data rows, so an
 * empty-selection export still opens as a valid, correctly-labeled
 * (if blank) spreadsheet instead of a sheet with no columns at all.
 */
export function downloadReportWorkbook({ detailRows, summaryRows, filename }) {
  const workbook = XLSX.utils.book_new()

  const detailSheet = XLSX.utils.json_to_sheet(detailRows, { header: DETAIL_HEADERS })
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail')

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows, { header: SUMMARY_HEADERS })
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  XLSX.writeFile(workbook, filename)
}

/**
 * Meaningful, filesystem-safe filenames per the spec's examples:
 *  - one staff + one month  -> Multybyte_Task_Report_<Staff>_<Month>_<Year>.xlsx
 *  - many staff + one month -> Multybyte_Task_Report_<Month>_<Year>.xlsx
 *  - one staff + many months -> Multybyte_Task_Report_<Staff>_<N>_Months.xlsx
 *  - many staff + many months -> Multybyte_Staff_Task_Report.xlsx
 */
export function buildExportFilename({ staffList, monthYearPairs }) {
  const base = 'Multybyte_Task_Report'
  const sanitize = (s) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')

  if (staffList.length === 1 && monthYearPairs.length === 1) {
    const { month, year } = monthYearPairs[0]
    return `${base}_${sanitize(staffList[0].full_name)}_${getMonthName(month)}_${year}.xlsx`
  }

  if (staffList.length > 1 && monthYearPairs.length === 1) {
    const { month, year } = monthYearPairs[0]
    return `${base}_${getMonthName(month)}_${year}.xlsx`
  }

  if (staffList.length === 1 && monthYearPairs.length > 1) {
    return `${base}_${sanitize(staffList[0].full_name)}_${monthYearPairs.length}_Months.xlsx`
  }

  return 'Multybyte_Staff_Task_Report.xlsx'
}
