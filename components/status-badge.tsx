import { STATUS_COLOR } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ServiceStatus } from '@/types/database.types'

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: ServiceStatus
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
        className,
      )}
      style={{ backgroundColor: STATUS_COLOR[status] }}
    >
      {label}
    </span>
  )
}
