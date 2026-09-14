import { useCallback, useState } from 'react'
import { getTasksForExport, getCompletionsForExport } from '../services/exportService'
import { getDaysInMonth, toISODate } from '../utils/dateUtils'
import {
  buildDetailRows,
  buildSummaryRows,
  buildExportFilename,
  downloadReportWorkbook,
} from '../utils/excelBuilder'

/**
 * Drives the Reports page's "Export Excel" action end to end:
 * fetch -> shape into workbook rows -> write the .xlsx -> trigger the
 * browser download. Every row in the resulting file comes from a fresh
 * Supabase read, scoped to whichever staff/months the caller passes in
 * (never anything already sitting in the page's own aggregated state,
 * and never fabricated) — see exportService for the admin-scoped reads
 * this makes.
 *
 * One (tasks, completions) fetch pair per month/year the export covers,
 * run sequentially rather than all at once — this keeps a
 * multi-month export from firing a burst of large parallel requests,
 * and its own await points naturally give the browser room to paint
 * the "Preparing Excel..." button state before the heavier, synchronous
 * row-building/XLSX-writing step runs.
 */
export function useReportExport() {
  const [status, setStatus] = useState('idle') // 'idle' | 'preparing' | 'error'
  const [error, setError] = useState(null)

  const runExport = useCallback(async ({ staffList, monthYearPairs }) => {
    setStatus('preparing')
    setError(null)

    // Let the "Preparing Excel..." label actually paint before the
    // fetch/build work below occupies the main thread.
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const staffIds = staffList.map((s) => s.id)
    const tasksByPair = {}
    const completionsByPair = {}

    for (const { month, year } of monthYearPairs) {
      const key = `${month}-${year}`
      const daysInMonth = getDaysInMonth(month, year)
      const startDate = toISODate(year, month, 1)
      const endDate = toISODate(year, month, daysInMonth)

      const [tasksResult, completionsResult] = await Promise.all([
        getTasksForExport(staffIds, month, year),
        getCompletionsForExport(staffIds, startDate, endDate),
      ])

      if (tasksResult.error || completionsResult.error) {
        setStatus('error')
        setError('Could not load data for export. Please try again.')
        return { success: false }
      }

      tasksByPair[key] = tasksResult.tasks
      completionsByPair[key] = completionsResult.completions
    }

    try {
      const detailRows = buildDetailRows({ staffList, monthYearPairs, tasksByPair, completionsByPair })
      const summaryRows = buildSummaryRows({ staffList, monthYearPairs, tasksByPair, completionsByPair })
      const filename = buildExportFilename({ staffList, monthYearPairs })

      downloadReportWorkbook({ detailRows, summaryRows, filename })

      setStatus('idle')
      return { success: true }
    } catch {
      setStatus('error')
      setError('Could not generate the Excel file. Please try again.')
      return { success: false }
    }
  }, [])

  return { status, error, runExport }
}
