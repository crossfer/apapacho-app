// -----------------------------------------------------------------------------
// Zero-dependency "today" / "this month" boundaries in the business's local
// timezone (San Diego / LA properties -> America/Los_Angeles), for dashboard
// stats. Naive UTC-day boundaries would misclassify orders scheduled near
// midnight Pacific, which matters for a same-day ops dashboard.
//
// Works by re-deriving the timezone's UTC offset from Intl.DateTimeFormat at
// the relevant instant, so it's correct across DST changes.
// -----------------------------------------------------------------------------

export const BUSINESS_TIMEZONE = 'America/Los_Angeles'

function partsOf(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  return parts.reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {})
}

function offsetMinutesAt(date: Date, timeZone: string): number {
  const p = partsOf(date, timeZone)
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  )
  return (asUTC - date.getTime()) / 60000
}

function zonedYMD(date: Date, timeZone: string) {
  const p = partsOf(date, timeZone)
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) }
}

/** The UTC instant corresponding to local midnight on (year, month, day) in timeZone. */
function zonedMidnightUTC(year: number, month: number, day: number, timeZone: string): Date {
  const guessUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offset = offsetMinutesAt(new Date(guessUTC), timeZone)
  return new Date(guessUTC - offset * 60000)
}

/** [start, end) of "today" in timeZone, as UTC Date instants. */
export function getTodayRange(timeZone: string = BUSINESS_TIMEZONE) {
  const { year, month, day } = zonedYMD(new Date(), timeZone)
  const start = zonedMidnightUTC(year, month, day, timeZone)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/** [start, end) of "this month" in timeZone, as UTC Date instants. */
export function getMonthRange(timeZone: string = BUSINESS_TIMEZONE) {
  const { year, month } = zonedYMD(new Date(), timeZone)
  const start = zonedMidnightUTC(year, month, 1, timeZone)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = zonedMidnightUTC(nextYear, nextMonth, 1, timeZone)
  return { start, end }
}
