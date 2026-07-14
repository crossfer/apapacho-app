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
