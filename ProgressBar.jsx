/**
 * Small horizontal progress bar. Color reflects the percentage so a
 * scan down the Staff overview table surfaces who's behind without
 * reading every number: lime (on track) / amber (in progress) / red
 * (behind), matching the same thresholds used for the Status badge.
 */
export default function ProgressBar({ percent, size = 'md' }) {
  const clamped = Math.min(100, Math.max(0, percent))
  const barColor = clamped >= 80 ? 'bg-lime-400' : clamped >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${height}`}
    >
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
