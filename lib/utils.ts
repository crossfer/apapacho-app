import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** "$1,234.00" — fixed en-US/USD formatting regardless of app locale. */
export function formatUSD(amount: number): string {
  return usdFormatter.format(amount)
}

/**
 * Compact date+time for table cells — "Jul 23, 7:20 PM" — that stays on one
 * line at typical column widths. Drops the year when it's the current year,
 * since that's the common case and it's the easiest part to cut.
 */
export function formatCompactDate(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const includeYear = d.getFullYear() !== new Date().getFullYear()
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}
