// Shared "Job Creation Date" filter — options + UK (Europe/London) calendar-day
// boundaries. "Last 24 hours" means today from UK midnight (12am), NOT a rolling
// 24h window; "last N days" means the last N UK calendar days including today.

export const JOB_DATE_OPTIONS: { value: string; label: string }[] = [
    { value: 'h24', label: 'Last 24 hours' },
    { value: 'd2', label: 'Last 2 days' },
    { value: 'd3', label: 'Last 3 days' },
    { value: 'd4', label: 'Last 4 days' },
    { value: 'd5', label: 'Last 5 days' },
    { value: 'd6', label: 'Last 6 days' },
    { value: 'w1', label: 'Last week' },
    { value: 'w2', label: 'Last 2 weeks' },
    { value: 'w3', label: 'Last 3 weeks' },
    { value: 'w4', label: 'Last 4 weeks' },
    { value: 'custom', label: 'Custom dates' },
]

// value → number of UK calendar days the window spans (today = 1)
const RANGE_DAYS: Record<string, number> = { h24: 1, d2: 2, d3: 3, d4: 4, d5: 5, d6: 6, w1: 7, w2: 14, w3: 21, w4: 28 }

const LONDON = 'Europe/London'

/** Europe/London offset from UTC (ms) at a given instant. */
function londonOffsetMs(at: Date): number {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: LONDON, hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).formatToParts(at).map(x => [x.type, x.value]),
    ) as Record<string, string>
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
    return asUTC - at.getTime()
}

/** UTC instant of UK local midnight, `daysAgo` UK calendar days before today. */
export function ukMidnightUtc(daysAgo: number, base: Date = new Date()): Date {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, year: 'numeric', month: '2-digit', day: '2-digit' })
            .formatToParts(base).map(x => [x.type, x.value]),
    ) as Record<string, string>
    const guess = Date.UTC(+p.year, +p.month - 1, (+p.day) - daysAgo, 0, 0, 0)
    return new Date(guess - londonOffsetMs(new Date(guess)))
}

/** UTC instant of UK local midnight for a 'YYYY-MM-DD' date string. */
export function ukMidnightUtcForDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number)
    const guess = Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0)
    return new Date(guess - londonOffsetMs(new Date(guess)))
}

/** Resolve a filter selection to a [startMs, endMs) window in real UTC ms. */
export function jobDateRange(value: string, from?: string, to?: string): { startMs: number | null; endMs: number | null } {
    if (!value) return { startMs: null, endMs: null }
    if (value === 'custom') {
        return {
            startMs: from ? ukMidnightUtcForDate(from).getTime() : null,
            endMs: to ? ukMidnightUtcForDate(to).getTime() + 86400000 : null, // inclusive of the whole `to` day
        }
    }
    const days = RANGE_DAYS[value]
    if (!days) return { startMs: null, endMs: null }
    return { startMs: ukMidnightUtc(days - 1).getTime(), endMs: null }
}

/** True if `createdAt` falls within the selected job-date window. */
export function inJobDateRange(createdAt: string | Date | null | undefined, value: string, from?: string, to?: string): boolean {
    if (!value) return true
    if (!createdAt) return false
    const t = new Date(createdAt).getTime()
    if (Number.isNaN(t)) return false
    const { startMs, endMs } = jobDateRange(value, from, to)
    if (startMs != null && t < startMs) return false
    if (endMs != null && t >= endMs) return false
    return true
}
